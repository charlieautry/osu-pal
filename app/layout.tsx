import type { Metadata } from "next";
import { Inter as FontSans } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import "./globals.css";

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" }
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "The PAL @ OkState",
    template: "%s | The PAL @ OkState"
  },
  description: "Find and download course materials, assignments, and resources for your OSU classes",
  applicationName: "The PAL @ OkState",
  authors: [{ name: "The PAL @ OkState Team" }],
  keywords: ["OSU", "course materials", "assignments", "resources", "education"],
  creator: "The PAL @ OkState Team",
  metadataBase: new URL('https://osu-pal.vercel.app'),
  icons: {
    icon: '/images/OSU.png',
    shortcut: '/images/OSU.png',
    apple: '/images/OSU.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'The PAL @ OkState',
    description: 'Find and download course materials, assignments, and resources for your OSU classes',
    siteName: 'The PAL @ OkState',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The PAL @ OkState - Course Materials and Resources',
    description: 'Find and download course materials, assignments, and resources for your OSU classes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontSans.variable} suppressHydrationWarning>
      <head>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      </head>
      <body className="min-h-screen bg-background font-sans antialiased transition-colors">
        <header className="sticky top-0 z-50 w-full border-b border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-800/70 backdrop-blur supports-backdrop-filter:bg-slate-200/60 dark:supports-backdrop-filter:bg-slate-800/60">
          <div className="container flex h-20 max-w-7xl items-center px-6 py-3">
            <div className="flex items-center space-x-2">
              <Image 
                src="/images/PAL.png" 
                alt="" 
                width={275} 
                height={62} 
                className="rounded-sm select-none pointer-events-none" 
                priority
                draggable={false}
              />
            </div>
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-4rem)] flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
