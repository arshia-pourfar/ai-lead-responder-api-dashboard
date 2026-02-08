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
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASS || "",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

export interface Email {
    from: string;
    name?: string;
    subject: string;
    text: string;
}

// نوع خروجی تابع simpleParser
type ParsedEmail = Awaited<ReturnType<typeof simpleParser>>;

// interface ساده برای msg
interface ImapMessage {
    on(event: "body", callback: (stream: Readable) => void): void;
}

async function parseEmail(stream: Readable): Promise<Email> {
    const parsed: ParsedEmail = await simpleParser(stream);
    return {
        from: parsed.from?.value?.[0]?.address || "",
        name: parsed.from?.value?.[0]?.name || "",
        subject: parsed.subject || "",
        text: parsed.text || "",
    };
}

// خواندن یک ایمیل
export async function readOneEmail(): Promise<Email | null> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
            imap.openBox("INBOX", false, (err: Error | null) => {
                if (err) return reject(err);

                imap.search(["UNSEEN"], (err: Error | null, results?: number[]) => {
                    if (err || !results || results.length === 0) {
                        imap.end();
                        return resolve(null);
                    }

                    const latest = results[results.length - 1];
                    const f = imap.fetch(latest, { bodies: "" });

                    f.on("message", (msg: ImapMessage) => {
                        msg.on("body", (stream: Readable) => {
                            parseEmail(stream)
                                .then((email) => {
                                    imap.addFlags(latest, "\\Seen", () => {
                                        imap.end();
                                        resolve(email);
                                    });
                                })
                                .catch(reject);
                        });
                    });

                    f.once("error", reject);
                });
            });
        });

        imap.once("error", reject);
        imap.connect();
    });
}

// خواندن چند ایمیل خوانده نشده
export async function readUnreadEmails(limit = 10): Promise<Email[]> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
            imap.openBox("INBOX", false, (err: Error | null) => {
                if (err) return reject(err);

                imap.search(["UNSEEN"], (err: Error | null, results?: number[]) => {
                    if (err || !results || results.length === 0) {
                        imap.end();
                        return resolve([]);
                    }

                    const latest = results.slice(-limit);
                    const emails: Email[] = [];

                    const f = imap.fetch(latest, { bodies: "" });

                    f.on("message", (msg: ImapMessage, _seqno: number) => {
                        msg.on("body", (stream: Readable) => {
                            parseEmail(stream)
                                .then((email) => emails.push(email))
                                .catch(console.error);
                        });
                    });

                    f.once("end", () => {
                        imap.end();
                        resolve(emails);
                    });

                    f.once("error", reject);
                });
            });
        });

        imap.once("error", reject);
        imap.connect();
    });
}
