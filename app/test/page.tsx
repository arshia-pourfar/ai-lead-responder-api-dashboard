"use client";
import { useEffect, useState } from "react";

interface Email {
    id: string;
    subject: string;
    body: string;
    aiReply?: string;
}

export default function EmailsPage() {
    const [emails, setEmails] = useState<Email[]>([]);

    useEffect(() => {
        fetch("/api/emails", { headers: { "x-user-id": "user-1" } })
            .then(res => res.json())
            .then(setEmails);
    }, []);


    return (
        <div>
            <h1>Emails</h1>
            {emails.map(email => (
                <div key={email.id} style={{ border: "1px solid gray", margin: 10, padding: 10 }}>
                    <h3>{email.subject}</h3>
                    <p>{email.body}</p>
                    <p>AI Reply: {email.aiReply}</p>
                </div>
            ))}
        </div>
    );
}
