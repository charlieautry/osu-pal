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
    default: "OSU PAL - Course Materials and Resources",
    template: "%s | OSU PAL"
  },
  description: "Find and download course materials, assignments, and resources for your OSU classes",
  applicationName: "OSU PAL",
  authors: [{ name: "OSU PAL Team" }],
  keywords: ["OSU", "course materials", "assignments", "resources", "education"],
  creator: "OSU PAL Team",
  metadataBase: new URL('https://osu-pal.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'OSU PAL - Course Materials and Resources',
    description: 'Find and download course materials, assignments, and resources for your OSU classes',
    siteName: 'OSU PAL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OSU PAL - Course Materials and Resources',
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
      <body className="min-h-screen bg-background font-sans antialiased transition-colors">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="container flex h-20 max-w-7xl items-center px-6 py-3">
            <Link 
              href="/" 
              className="flex items-center space-x-2 transition-opacity hover:opacity-90"
              aria-label="OSU PAL Home"
            >
              <Image 
                src="/images/PAL.png" 
                alt="" 
                width={275} 
                height={62} 
                className="rounded-sm" 
                priority
              />
            </Link>
          </div>
        </header>
        <main className="flex min-h-[calc(100vh-4rem)] flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
