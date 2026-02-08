"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    router.push("/login");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-sm font-semibold text-text hover:border-primary transition">
        {userName}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-lg p-2 z-50">
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
