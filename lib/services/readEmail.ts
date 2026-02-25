import Imap from "imap";
import { simpleParser } from "mailparser";
import { Readable } from "stream";
import dotenv from "dotenv";
import {
    ResolvedEmailCredentials,
    resolveEmailCredentialCandidates,
} from "@/lib/services/emailCredentials";
dotenv.config();

const EMAIL_IMAP_DIAGNOSTICS =
    (process.env.EMAIL_IMAP_DIAGNOSTICS || "").toLowerCase() === "true";

function imapDiagnosticsLog(message: string, payload?: Record<string, unknown>): void {
    if (!EMAIL_IMAP_DIAGNOSTICS) return;
    if (payload) {
        console.log(`[readEmail] ${message}`, payload);
        return;
    }
    console.log(`[readEmail] ${message}`);
}

interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port?: number;
    tls?: boolean;
    tlsOptions?: object;
}

export interface Email {
    uid: number;
    from: string;
    name?: string;
    subject: string;
    text: string;
    html?: string;
    date?: Date;
}

type ParsedEmail = Awaited<ReturnType<typeof simpleParser>>;

interface ImapMessage {
    on(event: "body", callback: (stream: Readable) => void): void;
    once(event: "attributes", callback: (attrs: FetchMessageAttributes) => void): void;
}

interface FetchMessageAttributes {
    uid?: number;
}

interface ImapFetchRequest {
    on(event: "message", callback: (msg: ImapMessage, seqno: number) => void): void;
    once(event: "end" | "error", callback: (error?: Error) => void): void;
}

type ImapClient = InstanceType<typeof Imap>;
export interface PaginatedUnreadResult {
    emails: Email[];
    total: number;
}

interface ImapConfigCandidate {
    source: ResolvedEmailCredentials["source"];
    emailAddress: string;
    config: ImapConfig;
}

function toImapConfig(credentials: ResolvedEmailCredentials): ImapConfig {
    return {
        user: credentials.emailAddress,
        password: credentials.appPassword,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        // timeouts to avoid hanging during network / auth issues
        // node-imap supports connTimeout and authTimeout in milliseconds
        // keepalive reduces TCP disconnects for long-running dev environments
        // these are optional and will help surface failures faster while
        // still allowing reasonable time for slow networks.
        // @see https://github.com/mscdex/node-imap
        // (note: type-checkers may not know these properties but Imap accepts them)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        connTimeout: 7000,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        authTimeout: 9000,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        keepalive: { interval: 10000, idleInterval: 300000, forceNoop: true },
    };
}

async function getImapConfigCandidates(userId?: string): Promise<ImapConfigCandidate[]> {
    const candidates = await resolveEmailCredentialCandidates(userId);
    return candidates.map((candidate) => ({
        source: candidate.source,
        emailAddress: candidate.emailAddress,
        config: toImapConfig(candidate),
    }));
}

function isImapAuthenticationFailure(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes("authenticationfailed") ||
        message.includes("invalid credentials") ||
        message.includes("auth")
        // treat auth timeouts as authentication failures so we can fallback
        // to other credential candidates when available
        || message.includes("timed out while authenticating")
        || (message.includes("timed out") && message.includes("auth"))
    );
}

function describeImapError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        const extended = error as Error & {
            textCode?: string;
            source?: string;
            type?: string;
        };

        return {
            message: extended.message,
            textCode: extended.textCode || null,
            source: extended.source || null,
            type: extended.type || null,
        };
    }

    return {
        message: String(error),
    };
}

async function runWithImapFallback<T>(
    userId: string | undefined,
    onMissingCredentials: () => T,
    operation: (imapConfig: ImapConfig) => Promise<T>
): Promise<T> {
    const candidates = await getImapConfigCandidates(userId);
    imapDiagnosticsLog("runWithImapFallback:candidates", {
        userId: userId || null,
        count: candidates.length,
        sources: candidates.map((candidate) => candidate.source),
        emails: candidates.map((candidate) => candidate.emailAddress),
    });

    if (candidates.length === 0) {
        return onMissingCredentials();
    }

    let lastError: unknown;

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        imapDiagnosticsLog("runWithImapFallback:attempt", {
            userId: userId || null,
            attempt: index + 1,
            source: candidate.source,
            email: candidate.emailAddress,
        });

        try {
            const result = await operation(candidate.config);
            imapDiagnosticsLog("runWithImapFallback:success", {
                userId: userId || null,
                attempt: index + 1,
                source: candidate.source,
                email: candidate.emailAddress,
            });
            return result;
        } catch (error) {
            lastError = error;
            imapDiagnosticsLog("runWithImapFallback:error", {
                userId: userId || null,
                attempt: index + 1,
                source: candidate.source,
                email: candidate.emailAddress,
                ...describeImapError(error),
                authFailure: isImapAuthenticationFailure(error),
            });

            const hasNext = index < candidates.length - 1;
            const canFallback =
                hasNext &&
                candidate.source === "user" &&
                isImapAuthenticationFailure(error);

            if (canFallback) {
                console.warn(
                    `IMAP authentication failed for user credentials (${candidate.emailAddress}); trying fallback credentials.`
                );
                continue;
            }

            throw error;
        }
    }

    if (lastError instanceof Error) {
        throw lastError;
    }

    throw new Error("IMAP operation failed");
}

function openInbox(imap: ImapClient): Promise<void> {
    return new Promise((resolve, reject) => {
        imap.openBox("INBOX", false, (err: Error | null) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function searchUnseen(imap: ImapClient): Promise<number[]> {
    return new Promise((resolve, reject) => {
        imap.search(["UNSEEN"], (err: Error | null, results?: number[]) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(results ?? []);
        });
    });
}

function sortUnseenByArrival(imap: ImapClient): Promise<number[]> {
    return new Promise((resolve) => {
        const sort = (imap as unknown as {
            sort?: (
                sortCriteria: string[],
                searchCriteria: unknown[],
                cb: (err: Error | null, results?: number[]) => void
            ) => void;
        }).sort;

        if (!sort) {
            resolve([]);
            return;
        }

        try {
            sort.call(imap, ["-ARRIVAL"], ["UNSEEN"], (err: Error | null, results?: number[]) => {
                if (err) {
                    resolve([]);
                    return;
                }
                resolve(results ?? []);
            });
        } catch {
            resolve([]);
        }
    });
}

async function parseEmailContent(stream: Readable): Promise<Omit<Email, "uid">> {
    const parsed: ParsedEmail = await simpleParser(stream);
    const html =
        typeof parsed.html === "string"
            ? parsed.html
            : Buffer.isBuffer(parsed.html)
                ? parsed.html.toString("utf8")
                : "";
    const fallbackText = html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
    const text = (parsed.text || "").trim() || fallbackText;

    return {
        from: parsed.from?.value?.[0]?.address || "",
        name: parsed.from?.value?.[0]?.name || "",
        subject: parsed.subject || "",
        text,
        html: html || undefined,
        date: parsed.date || undefined,
    };
}

function fetchEmailsByUids(imap: ImapClient, uids: number[]): Promise<Email[]> {
    return new Promise((resolve, reject) => {
        const selected = Array.from(
            new Set(uids.filter((uid) => Number.isFinite(uid) && uid > 0))
        );

        if (selected.length === 0) {
            resolve([]);
            return;
        }

        const parsePromises: Promise<Email>[] = [];
        const fetcher = imap.fetch(selected, { bodies: "" }) as ImapFetchRequest;

        fetcher.on("message", (msg: ImapMessage) => {
            const promise = new Promise<Email>((res, rej) => {
                const uidPromise = new Promise<number>((resolveUid) => {
                    msg.once("attributes", (attrs: FetchMessageAttributes) => {
                        resolveUid(attrs.uid ?? 0);
                    });
                });

                msg.on("body", async (stream: Readable) => {
                    try {
                        const [uid, parsed] = await Promise.all([
                            uidPromise,
                            parseEmailContent(stream),
                        ]);
                        const email = { ...parsed, uid };
                        res(email);
                    } catch (error) {
                        rej(error);
                    }
                });
            });

            parsePromises.push(promise);
        });

        fetcher.once("end", async () => {
            try {
                const parsed = await Promise.all(parsePromises);
                resolve(parsed.sort((a, b) => {
                    const left = a.date?.getTime() ?? 0;
                    const right = b.date?.getTime() ?? 0;
                    if (right !== left) return right - left;
                    return b.uid - a.uid;
                }));
            } catch (error) {
                reject(error);
            }
        });

        fetcher.once("error", (error?: Error) => {
            reject(error ?? new Error("IMAP fetch error"));
        });
    });
}

export async function readOneEmail(userId?: string): Promise<Email | null> {
    return runWithImapFallback<Email | null>(
        userId,
        () => null,
        async (imapConfig) =>
            new Promise((resolve, reject) => {
                const imap = new Imap(imapConfig);
                imapDiagnosticsLog("imap: connecting", { host: imapConfig.host, user: imapConfig.user });

                imap.once("ready", async () => {
                    try {
                        await openInbox(imap);
                        const unseen = await searchUnseen(imap);
                        if (unseen.length === 0) {
                            imap.end();
                            resolve(null);
                            return;
                        }

                        const latestUid = unseen[unseen.length - 1];
                        const fetcher = imap.fetch(latestUid, { bodies: "" }) as ImapFetchRequest;
                        let email: Email | null = null;

                        fetcher.on("message", (msg: ImapMessage) => {
                            const uidPromise = new Promise<number>((resolveUid) => {
                                msg.once("attributes", (attrs: FetchMessageAttributes) => {
                                    resolveUid(attrs.uid ?? latestUid);
                                });
                            });

                            msg.on("body", async (stream: Readable) => {
                                try {
                                    const [uid, parsed] = await Promise.all([
                                        uidPromise,
                                        parseEmailContent(stream),
                                    ]);
                                    email = { ...parsed, uid };
                                } catch (error) {
                                    reject(error);
                                }
                            });
                        });

                        fetcher.once("end", () => {
                            if (!email) {
                                imap.end();
                                resolve(null);
                                return;
                            }

                            imap.addFlags(latestUid, "\\Seen", (flagErr: Error | null) => {
                                if (flagErr) {
                                    imap.end();
                                    reject(flagErr);
                                    return;
                                }
                                imap.end();
                                resolve(email);
                            });
                        });

                        fetcher.once("error", (error?: Error) => {
                            imap.end();
                            reject(error ?? new Error("IMAP fetch error"));
                        });
                    } catch (error) {
                        imap.end();
                        reject(error);
                    }
                });

                imap.once("error", (err: Error) => {
                    imapDiagnosticsLog("imap: error", describeImapError(err));
                    reject(err);
                });
                imap.connect();
            })
    );
}

export async function markEmailAsSeenByUid(uid: number, userId?: string): Promise<void> {
    return runWithImapFallback<void>(
        userId,
        () => {
            throw new Error("Email credentials are missing");
        },
        async (imapConfig) =>
            new Promise<void>((resolve, reject) => {
                const imap = new Imap(imapConfig);
                imapDiagnosticsLog("imap: connect for markSeen", { host: imapConfig.host, user: imapConfig.user, uid });

                imap.once("ready", async () => {
                    try {
                        await openInbox(imap);
                        imap.addFlags(uid, "\\Seen", (err: Error | null) => {
                            imap.end();
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    } catch (error) {
                        imap.end();
                        reject(error);
                    }
                });

                imap.once("error", (err: Error) => {
                    imapDiagnosticsLog("imap: error (markSeen)", describeImapError(err));
                    reject(err);
                });
                imap.connect();
            })
    );
}

export async function readUnreadEmailsPaginated(
    limit: number,
    offset: number,
    userId?: string
): Promise<PaginatedUnreadResult> {
    return runWithImapFallback<PaginatedUnreadResult>(
        userId,
        () => ({ emails: [], total: 0 }),
        async (imapConfig) =>
            new Promise((resolve, reject) => {
                const imap = new Imap(imapConfig);
                imapDiagnosticsLog("imap: connect for unread fetch", { host: imapConfig.host, user: imapConfig.user, limit, offset });

                imap.once("ready", async () => {
                    try {
                        await openInbox(imap);

                        const sortedByArrival = await sortUnseenByArrival(imap);
                        const unseen = sortedByArrival.length > 0
                            ? sortedByArrival
                            : (await searchUnseen(imap)).sort((a, b) => b - a);

                        const total = unseen.length;

                        if (total === 0) {
                            imap.end();
                            resolve({ emails: [], total: 0 });
                            return;
                        }

                        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50;
                        const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
                        const selectedUids = unseen.slice(safeOffset, safeOffset + safeLimit);

                        if (selectedUids.length === 0) {
                            imap.end();
                            resolve({ emails: [], total });
                            return;
                        }

                        const emails = await fetchEmailsByUids(imap, selectedUids);
                        imap.end();
                        resolve({ emails, total });
                    } catch (error) {
                        imap.end();
                        reject(error);
                    }
                });

                imap.once("error", (err: Error) => {
                    imapDiagnosticsLog("imap: error (unread)", describeImapError(err));
                    reject(err);
                });
                imap.connect();
            })
    );
}

export async function readUnreadEmails(userId?: string): Promise<Email[]> {
    const result = await readUnreadEmailsPaginated(Number.MAX_SAFE_INTEGER, 0, userId);
    return result.emails;
}
