"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { STAMP_COLOR, STAMP_TEXT } from "@/components/escrow-record";
import { EmptyState, ErrorState } from "@/components/state-triad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerTx, isLiveChain } from "@/lib/chain";
import { conditionSentence, shortHex, type ApiFailure, type DocketSnapshot, type Escrow } from "@/lib/data";
import { useEscrowLive } from "@/lib/use-escrow-live";

// DEMO step 8: the closed-docket escrow and the open-docket escrow on one screen.
// Each column owns one useEscrowLive, so in real mode both poll on their own and
// the closed side flips to RELEASED while the open side stays LOCKED.

export interface PairSide {
  id: number | null;
  docketId: number | null;
  seed: Escrow | null;
  docket: DocketSnapshot | null;
}

const EMPTY_COPY = "No escrow on this docket yet. Lock one on the escrow desk and it appears here.";

function isZeroHash(hash: string): boolean {
  return /^0x0+$/.test(hash);
}

function ColumnEmpty({ docket, docketId }: { docket: DocketSnapshot | null; docketId: number | null }) {
  return (
    <div className="min-w-0 space-y-4">
      {docketId !== null && (
        <p className="decreta-label text-muted-foreground">{docket?.docketNumber ?? `Docket ${docketId}`}</p>
      )}
      <EmptyState
        heading="h2"
        title={docket?.caseName ?? "Nothing locked here"}
        body={EMPTY_COPY}
        action={
          <Button asChild>
            <Link href="/escrows">Open the escrow desk</Link>
          </Button>
        }
      />
    </div>
  );
}

function PairColumn({ side, id }: { side: PairSide; id: number }) {
  const { escrow, resolved } = useEscrowLive(id, side.seed);

  if (!resolved) {
    return (
      <div className="min-w-0 border border-dashed border-border bg-secondary p-6 text-muted-foreground" role="status">
        Opening escrow No. {id}…
      </div>
    );
  }

  if (!escrow) return <ColumnEmpty docket={side.docket} docketId={side.docketId} />;

  const docket = side.docket ?? escrow.docketSnapshot ?? null;
  const newest = escrow.events.length > 0 ? escrow.events[escrow.events.length - 1] : null;
  const changed = side.seed !== null && escrow.status !== side.seed.status;
  const linkable = newest !== null && isLiveChain && !escrow.local && !isZeroHash(newest.txHash);

  return (
    <article className="decreta-seq min-w-0 space-y-4 border-t-2 border-primary bg-background p-5">
      <p className="decreta-label text-muted-foreground">
        Escrow No. {escrow.id} · {docket?.docketNumber ?? `docket ${escrow.docketId}`}
        {escrow.local && " · this browser"}
      </p>
      <h2 className="font-display text-2xl font-semibold leading-tight">{docket?.caseName ?? `Docket ${escrow.docketId}`}</h2>
      <p className="text-muted-foreground">
        {conditionSentence(escrow)}.{" "}
        {docket ? (docket.dateTerminated ? `Terminated ${docket.dateTerminated}.` : "Still open.") : ""}
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <div key={escrow.status} className={changed ? "decreta-stamp-in" : undefined}>
          <Badge variant="stamp" className={STAMP_COLOR[escrow.status]} aria-live="polite">
            {STAMP_TEXT[escrow.status]}
          </Badge>
        </div>
        <span className="font-display text-2xl font-semibold tabular-nums">{escrow.amountEth} ETH</span>
      </div>
      {newest && (
        <div className="min-w-0 border-l-4 border-border pl-4 text-sm">
          <p className="decreta-label text-muted-foreground">Newest event</p>
          <p>{newest.note}</p>
          <p className="break-all text-muted-foreground" title={newest.txHash}>
            {linkable ? (
              <a href={explorerTx(newest.txHash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {shortHex(newest.txHash)} on Etherscan
              </a>
            ) : (
              <>tx {shortHex(newest.txHash)}</>
            )}
          </p>
        </div>
      )}
      <Button asChild variant="outline">
        <Link href={`/escrows/${escrow.id}`}>Open record No. {escrow.id}</Link>
      </Button>
    </article>
  );
}

function Column({ side }: { side: PairSide }) {
  return side.id === null ? (
    <ColumnEmpty docket={side.docket} docketId={side.docketId} />
  ) : (
    <PairColumn key={side.id} side={side} id={side.id} />
  );
}

export function EscrowPair({
  left,
  right,
  listError,
}: {
  left: PairSide;
  right: PairSide;
  listError: { hint: string; code: ApiFailure["error"] } | null;
}) {
  const router = useRouter();

  return (
    <div className="mt-10 space-y-6">
      {listError && (
        <ErrorState
          title="The escrow register did not load"
          hint={listError.hint}
          code={listError.code}
          onRetry={() => router.refresh()}
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Column side={left} />
        <Column side={right} />
      </div>
    </div>
  );
}
