"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/dashboard");
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Unknown error occurred");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen">
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-xl border border-border w-80 flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Login</h2>
                {error && <p className="text-red-500 text-xs">{error}</p>}

                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border border-border rounded-md px-3 py-2 outline-none text-sm" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border border-border rounded-md px-3 py-2 outline-none text-sm" />

                <button className="bg-primary text-white py-2 rounded-md hover:bg-primary/80 text-sm">Login</button>
                <p className="text-xs text-muted">
                    Dont have an account? <a href="/signup" className="text-primary hover:underline">Sign up</a>
                </p>
            </form>
        </div>
    );
}
