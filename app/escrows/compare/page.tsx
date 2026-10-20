import type { Metadata } from "next";
import Link from "next/link";
import { EscrowPair, type PairSide } from "@/components/escrow-pair";
import { adapter } from "@/lib/adapter";
import type { Escrow } from "@/lib/types";

// Both sides read the chain in real mode; never serve a cached first render.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Side by side" };

// Keep in sync with lib/data/seed.ts and the "Try" buttons in components/escrow-console.tsx.
const CLOSED_DOCKET_ID = 68519034;
const OPEN_DOCKET_ID = 69102877;

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function readSide(id: number | null, docketId: number): Promise<PairSide> {
  const lookup = id !== null ? await adapter.getEscrow(id) : null;
  const seed = lookup?.ok ? lookup.data : null;
  // An id from the URL that the adapter does not know may be an escrow locked in
  // this browser; the client resolves it, so its docket is unknown here.
  const knownDocket = seed ? seed.docketId : id === null ? docketId : null;
  const docketResult = knownDocket !== null ? await adapter.getDocket(knownDocket) : null;
  return {
    id,
    docketId: knownDocket,
    seed,
    docket: docketResult?.ok ? docketResult.data : null,
  };
}

function highestOn(list: Escrow[], docketId: number): number | null {
  const ids = list.filter((e) => e.docketId === docketId).map((e) => e.id);
  return ids.length > 0 ? Math.max(...ids) : null;
}

function lowestLockedOn(list: Escrow[], docketId: number): number | null {
  const ids = list.filter((e) => e.docketId === docketId && e.status === "locked").map((e) => e.id);
  return ids.length > 0 ? Math.min(...ids) : null;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string; right?: string }>;
}) {
  const params = await searchParams;
  const list = await adapter.listEscrows();
  const escrows = list.ok ? list.data : [];

  const leftId = parseId(params.left) ?? highestOn(escrows, CLOSED_DOCKET_ID);
  const rightId = parseId(params.right) ?? lowestLockedOn(escrows, OPEN_DOCKET_ID);

  const [left, right] = await Promise.all([readSide(leftId, CLOSED_DOCKET_ID), readSide(rightId, OPEN_DOCKET_ID)]);

  return (
    <div className="decreta-ruled">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <Link
          href="/escrows"
          className="decreta-label inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to the escrow desk
        </Link>
        <header className="decreta-seq mt-4 max-w-prose space-y-4">
          <p className="decreta-label text-primary">Side by side</p>
          <h1 className="text-4xl font-semibold leading-tight">One docket closed. One did not.</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Each escrow waits on its own federal docket, and the same CRE check reads both. The money moves only on
            the docket where the court acted.
          </p>
        </header>
        <EscrowPair
          left={left}
          right={right}
          listError={list.ok ? null : { hint: list.hint, code: list.error }}
        />
      </div>
    </div>
  );
}
