"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ForgotPasswordContent() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const presetEmail = searchParams.get("email");
        if (presetEmail) {
            setEmail(presetEmail);
        }
    }, [searchParams]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(data?.error || "Could not send reset email.");
            }

            setMessage(
                data?.message ||
                "If an account exists with this email, a reset link has been sent."
            );
        } catch (submitError) {
            if (submitError instanceof Error) {
                setError(submitError.message);
            } else {
                setError("Could not send reset email.");
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
                <h2 className="text-lg font-semibold">Forgot Password</h2>

                {message && <p className="text-xs text-success">{message}</p>}
                {error && <p className="text-xs text-danger">{error}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                    autoComplete="email"
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-white py-2 rounded-md hover:bg-primary/80 text-sm disabled:opacity-60"
                >
                    {loading ? "Sending..." : "Send Reset Link"}
                </button>

                <p className="text-xs text-muted">
                    Back to <a href="/login" className="text-primary hover:underline">Login</a>
                </p>
            </form>
        </div>
    );
}

function ForgotPasswordFallback() {
    return (
        <div className="flex min-h-screen h-dvh items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8 text-sm text-muted">
                Loading...
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<ForgotPasswordFallback />}>
            <ForgotPasswordContent />
        </Suspense>
    );
}
