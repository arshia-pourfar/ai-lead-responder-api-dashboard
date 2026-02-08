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
