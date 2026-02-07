"use client";

import { useState } from "react";

export default function UserAvatar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* AVATAR */}
      <button
        onClick={() => setOpen(!open)}
        className="size-11 rounded-full border border-border flex items-center justify-center text-sm font-semibold text-text hover:border-primary transition"
      >
        A
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-lg p-2 z-50">
          <MenuItem label="Profile" />
          <MenuItem label="API Keys" />
          <MenuItem label="Billing" />
          <div className="border-t border-border my-1" />
          <MenuItem label="Logout" danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <button
      className={`w-full text-left px-3 py-2 text-sm rounded-md transition
        ${danger ? "text-red-500 hover:bg-red-500/10" : "text-text hover:bg-border"}`}
    >
      {label}
    </button>
  );
}
