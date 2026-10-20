import type { Metadata } from "next";
import Link from "next/link";
import { EscrowRecord } from "@/components/escrow-record";
import { adapter } from "@/lib/adapter";

// The record reads the chain in real mode; never serve a cached first render.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Escrow No. ${id}` };
}

export default async function EscrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const escrowId = Number(id);
  const lookup = Number.isSafeInteger(escrowId) && escrowId > 0 ? await adapter.getEscrow(escrowId) : null;
  const seed = lookup?.ok ? lookup.data : null;

  // Register escrows get a server-side docket read through the adapter.
  // Escrows created in this browser carry their own snapshot; the client handles them.
  const docketResult = seed ? await adapter.getDocket(seed.docketId) : null;
  const docket = docketResult?.ok ? docketResult.data : null;

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
