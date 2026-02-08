const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// === Token helpers (اگر بخوای auth اضافه کنی) ===
export const saveToken = (token: string) => localStorage.setItem('token', token);
export const getToken = () => localStorage.getItem('token');
export const removeToken = () => localStorage.removeItem('token');

// === Generic fetch helper ===
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options?.headers,
        },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

// === Email APIs ===
export interface Email {
    id: string;
    subject: string;
    sender: string;
    readyToSend?: boolean;
    readyToSell?: boolean;
    sellScore?: number;
}

export const emailApi = {
    getReadyToSend: () => fetcher<Email[]>('/api/ready-to-send'),
    getReadyToSell: () => fetcher<Email[]>('/api/ready-to-sell'),
    getAll: () => fetcher<Email[]>('/api/emails'),
    create: (email: Partial<Email>) => fetcher<Email>('/api/emails', {
        method: 'POST',
        body: JSON.stringify(email),
    }),
    analyze: (emailId: string) => fetcher<Email>('/api/emails/analyze', {
        method: 'POST',
        body: JSON.stringify({ emailId }),
    }),
};
