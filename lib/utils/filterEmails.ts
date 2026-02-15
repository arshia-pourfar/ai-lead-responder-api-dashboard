export interface SearchableEmail {
    subject?: string;
    sender?: string;
    body?: string;
    aiReply?: string;
    manualReply?: string;
}

export function filterEmailsByQuery<T extends SearchableEmail>(
    emails: T[],
    query: string
): T[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return emails;

    return emails.filter((email) =>
        [email.subject, email.sender, email.body, email.aiReply, email.manualReply]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
}

