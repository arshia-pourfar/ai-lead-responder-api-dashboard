import React, { useEffect, useState } from "react";

export interface Email {
    id: string | number;
    email: string;
    message?: string;
    replied?: boolean;
    avatar?: string;
}

const Inbox: React.FC = () => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchEmails = async () => {
            try {
                setLoading(true);
                const res = await fetch("http://localhost:5000/dashboard/emails");
                const data = await res.json();
                setEmails(Array.isArray(data) ? data : data.emails || []);
            } catch (err) {
                console.error(err);
                setEmails([]);
            } finally {
                setLoading(false);
            }
        };
        fetchEmails();
    }, []);

    const filtered = emails.filter(e =>
        (e.email + (e.message || ""))
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="bg-gray-800 p-4 rounded flex-1 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Incoming Emails</h3>
            <input
                type="text"
                placeholder="Search emails..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="p-2 rounded text-black"
            />
            {loading ? (
                <p>Loading emails...</p>
            ) : (
                <ul className="flex-1 overflow-y-auto space-y-2">
                    {filtered.map(e => (
                        <li key={e.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                            <div className="flex items-center gap-3">
                                <img
                                    src={e.avatar || "https://i.pravatar.cc/40"}
                                    alt="avatar"
                                    className="w-10 h-10 rounded-full"
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold">{e.email}</span>
                                    <span className="text-sm text-gray-300">{e.message || "-"}</span>
                                </div>
                            </div>
                            <div>
                                {e.replied ? (
                                    <span className="text-green-500 text-xl">✅</span>
                                ) : (
                                    <span className="text-yellow-400 text-xl">❓</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Inbox;
