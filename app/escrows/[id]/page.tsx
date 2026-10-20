import type { Metadata } from "next";
import Link from "next/link";
import { EscrowRecord } from "@/components/escrow-record";
import { getDocket } from "@/lib/courtlistener";
import { findDocket, findEscrow } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Escrow No. ${id} · Decreta` };
}

export default async function EscrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const escrowId = Number(id);
  const seed = Number.isSafeInteger(escrowId) ? findEscrow(escrowId) ?? null : null;

  // Seed escrows get a server-side docket read (live when the token is set).
  // Escrows created in this browser carry their own snapshot; the client handles them.
  let docket = seed ? findDocket(seed.docketId) ?? null : null;
  if (seed) {
    const lookup = await getDocket(seed.docketId);
    if (lookup.ok) docket = lookup.docket;
  }

  return (
    <div className="decreta-ruled">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <Link href="/escrows" className="decreta-label text-muted-foreground underline-offset-4 hover:underline">
          Back to the escrow desk
        </Link>
        <EscrowRecord escrowId={escrowId} seed={seed} seedDocket={docket} />
      </div>
    </div>
  );
}
