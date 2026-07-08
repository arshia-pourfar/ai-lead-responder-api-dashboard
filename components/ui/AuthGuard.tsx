"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const publicPaths = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !publicPaths.includes(pathname)) {
      router.replace("/login");
    }
  }, [router, pathname]);

  return <>{children}</>;
}
