import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Data Analytics Academy — Beginner to Master, Free",
  description:
    "Learn data analytics from beginner to master: 80+ detailed lessons, 4 levels, free in-browser tools (Excel formulas, BI dashboards, SQL playground, data cleaner, ETL automation) and 7 real-world projects that build a GitHub-ready portfolio.",
  keywords: [
    "data analytics course", "learn SQL", "Excel formulas", "Power BI", "data cleaning",
    "ETL pipeline", "analytics portfolio", "free data analytics training",
  ],
  openGraph: {
    title: "Data Analytics Academy",
    description: "Beginner → Master data analytics with free built-in tools and real-world projects.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0b] text-zinc-100`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
