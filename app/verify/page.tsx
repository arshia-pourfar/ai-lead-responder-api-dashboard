"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        const emailFromQuery = searchParams.get("email");
        if (emailFromQuery) {
            setEmail(emailFromQuery);
        }
    }, [searchParams]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setVerifying(true);

        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Verification failed.");
            }

            setMessage("Email verified successfully. Redirecting to login...");
            window.setTimeout(() => router.push("/login"), 1200);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Unknown error occurred");
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setMessage("");
        setResending(true);

        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not resend verification code.");
            }

            setMessage(data.message || "If an account exists, a new verification code has been sent.");
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Unknown error occurred");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex min-h-screen h-dvh items-center justify-center p-4">
            <form
                onSubmit={handleVerify}
                className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:p-8"
            >
                <h2 className="text-lg font-semibold">Verify Email</h2>
                <p className="text-xs text-muted">
                    Enter the 6-digit code we sent to your inbox.
                </p>

                {error && <p className="text-red-500 text-xs">{error}</p>}
                {message && <p className="text-green-600 text-xs">{message}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-border rounded-md px-3 py-2 outline-none text-sm"
                    autoComplete="email"
                />
                <input
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="border border-border rounded-md px-3 py-2 outline-none text-sm tracking-[0.3em]"
                    autoComplete="one-time-code"
                />

                <button
                    type="submit"
                    disabled={verifying}
                    className="bg-primary text-white py-2 rounded-md hover:bg-primary/80 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {verifying ? "Verifying..." : "Verify Email"}
                </button>

                <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="border border-border text-text py-2 rounded-md hover:bg-border/40 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {resending ? "Sending..." : "Resend Code"}
                </button>

                <p className="text-xs text-muted">
                    Already verified?{" "}
                    <a href="/login" className="text-primary hover:underline">
                        Login
                    </a>
                </p>
            </form>
        </div>
    );
}

function VerifyPageFallback() {
    return (
        <div className="flex min-h-screen h-dvh items-center justify-center p-4">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-lg font-semibold">Verify Email</h2>
                <p className="text-xs text-muted">Loading verification form...</p>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<VerifyPageFallback />}>
            <VerifyPageContent />
        </Suspense>
    );
}
