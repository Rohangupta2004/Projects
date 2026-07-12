import type { Metadata } from "next";
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
  title: "LeadForge AI — AI Lead Finder for Web Agencies",
  description: "Automate lead generation from IndiaMART, Justdial, TradeIndia & more. AI scores every business for website opportunity and revenue potential.",
  keywords: ["LeadForge", "AI Lead Finder", "B2B Leads India", "Web Agency Leads", "IndiaMART Scraper", "Justdial Scraper"],
  authors: [{ name: "LeadForge AI" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LeadForge AI",
    description: "AI Lead Finder for Web Agencies — find businesses that need a website.",
    url: "https://leadforge.ai",
    siteName: "LeadForge AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadForge AI",
    description: "AI Lead Finder for Web Agencies",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
