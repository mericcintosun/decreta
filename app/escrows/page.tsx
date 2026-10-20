import type { Metadata } from "next";
import { EscrowConsole, RegisterErrorState } from "@/components/escrow-console";
import { adapter, hasLiveDockets } from "@/lib/adapter";
import { totals, type DocketSnapshot } from "@/lib/data";

// The register reads the chain in real mode; never serve a build-time copy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Escrow desk",
  description: "Open an escrow against a federal docket and follow every escrow on the demo register.",
};

export default async function EscrowDeskPage() {
  const list = await adapter.listEscrows();
  const escrows = list.ok ? list.data : [];

  // One docket read per distinct docket on the register, through the same seam.
  const docketIds = [...new Set(escrows.map((e) => e.docketId))];
  const lookups = await Promise.all(docketIds.map((id) => adapter.getDocket(id)));
  const dockets: DocketSnapshot[] = lookups.flatMap((r) => (r.ok ? [r.data] : []));

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
          {!list.ok && <RegisterErrorState hint={list.hint} />}
        </header>
        <EscrowConsole
          seedEscrows={escrows}
          seedDockets={dockets}
          liveDockets={hasLiveDockets()}
        />
      </div>
    </div>
  );
}
