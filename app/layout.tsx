import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";

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
        <div className="flex min-h-screen h-[100dvh] flex-col overflow-hidden bg-card text-text md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
