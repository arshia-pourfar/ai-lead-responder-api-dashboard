"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Signup failed");

            router.push("/login");
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Unknown error occurred");
        }
    };

    return (
        <div className="flex min-h-screen h-screen items-center justify-center p-4">
            <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:p-8">
                <h2 className="text-lg font-semibold">Sign Up</h2>
                {error && <p className="text-red-500 text-xs">{error}</p>}

                <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="border border-border rounded-md px-3 py-2 outline-none text-sm" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border border-border rounded-md px-3 py-2 outline-none text-sm" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border border-border rounded-md px-3 py-2 outline-none text-sm" />

                <button className="bg-primary text-white py-2 rounded-md hover:bg-primary/80 text-sm">Sign Up</button>
                <p className="text-xs text-muted">
                    Already have an account? <a href="/login" className="text-primary hover:underline">Login</a>
                </p>
            </form>
        </div>
    );
}
