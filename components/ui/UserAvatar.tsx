"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notifyAuthChange } from "@/lib/hooks/useAuth";

export default function UserAvatar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const userName = (() => {
    const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!userData) return "A";
    try {
      const user = JSON.parse(userData);
      return user.name?.charAt(0).toUpperCase() || "A";
    } catch {
      return "A";
    }
  })();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    notifyAuthChange();
    router.push("/login");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm font-semibold text-text transition hover:border-primary sm:h-11 sm:w-11">
        {userName}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-border bg-card p-2 shadow-lg sm:w-44">
          <MenuItem label="Profile" onClick={() => router.push("/settings")} />
          <div className="border-t border-border my-1" />
          <MenuItem label="Logout" danger onClick={handleLogout} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, danger, onClick }: { label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm rounded-md transition ${danger ? "text-red-500 hover:bg-red-500/10" : "text-text hover:bg-border"}`}
    >
      {label}
    </button>
  );
}
