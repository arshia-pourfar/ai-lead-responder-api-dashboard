import Imap from "imap";
import { simpleParser } from "mailparser";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config();

interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port?: number;
    tls?: boolean;
    tlsOptions?: object;
}

const imapConfig: ImapConfig = {
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASS!,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

export interface Email {
    uid: number;
    from: string;
    name?: string;
    subject: string;
    text: string;
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
            // Some IMAP servers do not support SORT; fallback to search-based flow.
            resolve([]);
        }
    });
}

async function parseEmailContent(stream: Readable): Promise<Omit<Email, "uid">> {
    const parsed: ParsedEmail = await simpleParser(stream);
    return {
        from: parsed.from?.value?.[0]?.address || "",
        name: parsed.from?.value?.[0]?.name || "",
        subject: parsed.subject || "",
        text: parsed.text || "",
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

export async function readOneEmail(): Promise<Email | null> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

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

        imap.once("error", reject);
        imap.connect();
    });
}

export async function markEmailAsSeenByUid(uid: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

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

        imap.once("error", reject);
        imap.connect();
    });
}

export async function readUnreadEmailsPaginated(limit: number, offset: number): Promise<PaginatedUnreadResult> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

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

        imap.once("error", reject);
        imap.connect();
    });
}

export async function readUnreadEmails(): Promise<Email[]> {
    const result = await readUnreadEmailsPaginated(Number.MAX_SAFE_INTEGER, 0);
    return result.emails;
}
