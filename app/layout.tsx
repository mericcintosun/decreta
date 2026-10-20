import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-fraunces" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], display: "swap", variable: "--font-source-sans" });

const title = "Decreta: escrow that follows the docket";
const description =
  "A settlement pays when the court closes the case. Decreta locks the funds on-chain and a Chainlink CRE workflow releases them when the docket closes.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://decreta.vercel.app"),
  title: { default: title, template: "%s | Decreta" },
  description,
  openGraph: { title, description, url: "/", siteName: "Decreta", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-border bg-background">
          <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 font-display text-lg font-semibold">
              <Image src="/logo.svg" alt="" width={28} height={28} unoptimized priority />
              Decreta
            </Link>
            <SiteNav />
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
