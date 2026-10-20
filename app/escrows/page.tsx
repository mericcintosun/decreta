import type { Metadata } from "next";
import { EscrowConsole } from "@/components/escrow-console";
import { hasLiveCourtListener } from "@/lib/courtlistener";
import { dockets, escrows, totals } from "@/lib/data";

export const metadata: Metadata = {
  title: "Escrow desk · Decreta",
  description: "Open an escrow against a federal docket and follow every escrow on the demo register.",
};

export default function EscrowDeskPage() {
  const t = totals(escrows);

  return (
    <div className="decreta-ruled">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <header className="decreta-seq mb-12 space-y-4">
          <p className="decreta-label text-primary">Escrow desk</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">Lock it against the docket.</h1>
          <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
            Paste a CourtListener link, pick the court event that releases the money, and lock it. The register below
            holds {t.count} escrows: {t.releasedEth} ETH already paid out on docket events, {t.lockedEth} ETH still
            waiting on the court.
          </p>
        </header>
        <EscrowConsole seedEscrows={escrows} seedDockets={dockets} liveDockets={hasLiveCourtListener()} />
      </div>
    </div>
  );
}
