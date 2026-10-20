import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Doto, Geist, Geist_Mono } from "next/font/google";
import { Baseball } from "./ui";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const doto = Doto({ variable: "--font-doto", subsets: ["latin"], weight: ["700", "900"] });

export const metadata: Metadata = {
  title: "Matchday Revenue Desk",
  description: "Promotion calendars, sponsor prospects and local food partners for baseball clubs, grounded in measured attendance lift and Qloo taste data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${doto.variable} h-full antialiased`}>
      <body className="field flex min-h-full flex-col font-sans">
        <header className="border-b-2 border-ink bg-surface">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Baseball className="spin-hover h-9 w-9" />
              <span className="font-display text-2xl font-extrabold tracking-tight">MATCHDAY</span>
              <span className="hidden rounded-lg border-2 border-ink bg-sky px-2 py-0.5 text-xs font-bold tracking-wider sm:inline">REVENUE DESK</span>
            </Link>
            <nav aria-label="Main" className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold">
              <Link href="/" className="rounded-full px-3.5 py-2.5 hover:bg-bg">Clubs</Link>
              <Link href="/proof" className="rounded-full px-3.5 py-2.5 hover:bg-bg">Evidence</Link>
              <Link href="/proof#mcp" className="press chunk-sm rounded-full bg-surface px-3.5 py-2 text-sm font-bold">Use it in Claude</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6">{children}</main>
        <footer className="border-t-2 border-ink bg-surface">
          <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-3 px-4 py-5 text-[13px] text-muted sm:px-6">
            <span>Taste data from Qloo. Attendance and promotions from the MLB Stats API, used only as aggregates.</span>
            <span>Not affiliated with MLB or any club.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
