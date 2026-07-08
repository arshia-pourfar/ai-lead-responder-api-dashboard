import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";
import AuthGuard from "@/components/ui/AuthGuard";

export const metadata: Metadata = {
  title: "AI LEAD RESPONDER",
  description: "AI LEAD RESPONDER",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>
          <div className="flex min-h-screen h-screen flex-col overflow-hidden bg-card text-text md:flex-row">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">{children}</main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
