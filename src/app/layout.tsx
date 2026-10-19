import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Baseball } from "./ui";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Matchday Revenue Desk",
  description: "Promotion calendars, sponsor prospects and local food partners for baseball clubs, grounded in measured attendance lift and Qloo taste data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="field flex min-h-full flex-col font-sans">
        <header className="scoreboard text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <Baseball className="spin-hover h-8 w-8 drop-shadow" />
              <span className="font-display text-xl font-extrabold tracking-tight">Matchday</span>
              <span className="hidden rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium sm:inline">Revenue Desk</span>
            </Link>
            <nav className="flex gap-1 text-sm font-medium">
              <Link href="/" className="rounded-full px-3 py-1.5 hover:bg-white/15">Clubs</Link>
              <Link href="/proof" className="rounded-full px-3 py-1.5 hover:bg-white/15">Evidence</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line bg-surface/60 px-4 py-6 text-center text-xs text-muted">
          Taste data from Qloo. Attendance and promotions from the MLB Stats API, used only as aggregates. Not affiliated with MLB or any club.
        </footer>
      </body>
    </html>
  );
}
