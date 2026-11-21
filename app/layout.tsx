
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "YouthEngage - Learn, Play, Grow",
  description:
    "A fun platform for youth to learn through trivia, Q&A, mentorship and opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>

        <Navbar />

        <main className="min-h-screen bg-gray-50">
          {children}
        </main>

        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
