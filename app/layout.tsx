import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", variable: "--font-source-sans" });

export const metadata: Metadata = {
  title: "Decreta: escrow that follows the court docket",
  description:
    "Funds held on-chain that release by themselves when a real US federal court docket closes or records a new filing, checked by a Chainlink CRE workflow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
              <Image src="/logo.svg" alt="" width={28} height={28} unoptimized priority />
              Decreta
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/#how" className="underline-offset-4 hover:underline">
                How it works
              </Link>
              <Link href="/escrows" className="underline-offset-4 hover:underline">
                Escrow desk
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted-foreground">
            Decreta reads public docket data from CourtListener (Free Law Project). Sepolia testnet only. Not legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
