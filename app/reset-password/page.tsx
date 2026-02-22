"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setMessage("");
        setError("");

        if (!token) {
            setError("Reset token is missing.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    password,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(data?.error || "Could not reset password.");
            }

            setMessage(data?.message || "Password reset successful. Redirecting to login...");
            setTimeout(() => router.push("/login"), 1200);
        } catch (submitError) {
            if (submitError instanceof Error) {
                setError(submitError.message);
            } else {
                setError("Could not reset password.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen h-dvh items-center justify-center p-4">
            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:p-8"
            >
                <h2 className="text-lg font-semibold">Reset Password</h2>

                {message && <p className="text-xs text-success">{message}</p>}
                {error && <p className="text-xs text-danger">{error}</p>}

                <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                    autoComplete="new-password"
                    minLength={8}
                    required
                />

                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                    autoComplete="new-password"
                    minLength={8}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white py-2 rounded-md hover:bg-primary/80 text-sm disabled:opacity-60"
                >
                    {loading ? "Resetting..." : "Reset Password"}
                </button>

                <p className="text-xs text-muted">
                    Back to <a href="/login" className="text-primary hover:underline">Login</a>
                </p>
            </form>
        </div>
    );
}

function ResetPasswordFallback() {
    return (
        <div className="flex min-h-screen h-dvh items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8 text-sm text-muted">
                Loading...
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
