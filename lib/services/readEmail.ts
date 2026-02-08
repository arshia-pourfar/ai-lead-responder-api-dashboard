import Imap from "imap";
import { simpleParser } from "mailparser";
import { Readable } from "stream";
import dotenv from "dotenv";
dotenv.config();


const imapConfig: Imap.Config = {
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASS || "",
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

export interface Email {
    from: string;
    name?: string;
    subject: string;
    text: string;
}

export function readOneEmail(): Promise<Email | null> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
            imap.openBox("INBOX", false, (err) => {
                if (err) return reject(err);

                imap.search(["UNSEEN"], (err, results) => {
                    if (err || !results || results.length === 0) {
                        imap.end();
                        return resolve(null);
                    }

                    const latest = results[results.length - 1];
                    const f = imap.fetch(latest, { bodies: "" });

                    f.on("message", (msg) => {
                        msg.on("body", (stream: Readable) => {
                            simpleParser(stream)
                                .then(parsed => {
                                    imap.addFlags(latest, "\\Seen", () => {
                                        imap.end();
                                        resolve({
                                            from: parsed.from?.value?.[0]?.address || "",
                                            name: parsed.from?.value?.[0]?.name || "",
                                            subject: parsed.subject || "",
                                            text: parsed.text || ""
                                        });
                                    });
                                })
                                .catch(reject);
                        });
                    });
                });
            });
        });

        imap.once("error", reject);
        imap.connect();
    });
}

export function readUnreadEmails(limit = 10): Promise<Email[]> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(imapConfig);

        imap.once("ready", () => {
            imap.openBox("INBOX", false, (err) => {
                if (err) return reject(err);

                imap.search(["UNSEEN"], (err, results) => {
                    if (err || !results) {
                        imap.end();
                        return resolve([]);
                    }

                    const latest = results.slice(-limit);
                    const emails: Email[] = [];

                    const f = imap.fetch(latest, { bodies: "" });

                    f.on("message", (msg, seqno) => {
                        msg.on("body", (stream: Readable) => {
                            simpleParser(stream).then(parsed => {
                                emails.push({
                                    from: parsed.from?.value?.[0]?.address || "",
                                    name: parsed.from?.value?.[0]?.name || "",
                                    subject: parsed.subject || "",
                                    text: parsed.text || ""
                                });
                            });
                        });
                    });

                    f.once("end", () => {
                        imap.end();
                        resolve(emails);
                    });
                });
            });
        });

        imap.once("error", reject);
        imap.connect();
    });
}
