const requests = new Map<string, number>();

export function rateLimit(key: string) {
    const now = Date.now();
    const last = requests.get(key) || 0;

    if (now - last < 1000) {
        return false;
    }

    requests.set(key, now);
    return true;
}
