"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/state-triad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerTx, isLiveChain } from "@/lib/chain";
import type { ErrorCode } from "@/lib/errors";
import {
  conditionSentence,
  courtListenerUrl,
  evaluateCondition,
  mockTxHash,
  saveLocalEscrow,
  shortHex,
  type ApiResult,
  type DocketSnapshot,
  type Escrow,
  type EscrowEvent,
} from "@/lib/data";
import { useEscrowLive } from "@/lib/use-escrow-live";
import { cn } from "@/lib/utils";

export const STAMP_TEXT: Record<Escrow["status"], string> = {
  locked: "Locked",
  released: "Released",
  refunded: "Refunded",
};

export const STAMP_COLOR: Record<Escrow["status"], string> = {
  locked: "text-ochre",
  released: "text-ok",
  refunded: "text-bad",
};

const EVENT_LABEL: Record<EscrowEvent["kind"], string> = {
  deposited: "Deposited",
  checked: "Docket checked",
  released: "Released",
  refunded: "Refunded",
};

function stampTime(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function eth(value: string): string {
  return Number(value).toFixed(4);
}

function EscrowEmptyState({ escrowId }: { escrowId: number }) {
  return (
    <div className="mt-10">
      <EmptyState
        heading="h1"
        title={`No escrow No. ${escrowId} on this desk`}
        body={
          isLiveChain
            ? "The contract has no escrow with that number yet, and this browser has none either."
            : "It is not in the demo register, and this browser has no locally created escrow with that number."
        }
        action={
          <Button asChild>
            <Link href="/escrows">Open an escrow on the desk</Link>
          </Button>
        }
      />
    </div>
  );
}

export function EscrowRecord({
  escrowId,
  seed,
  seedDocket,
}: {
  escrowId: number;
  seed: Escrow | null;
  seedDocket: DocketSnapshot | null;
}) {
  const { escrow, setEscrow, resolved, balanceBefore } = useEscrowLive(escrowId, seed);
  const [freshDocket, setFreshDocket] = useState<DocketSnapshot | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<{ code: ErrorCode | null; hint: string } | null>(null);
  const docket = freshDocket ?? seedDocket ?? escrow?.docketSnapshot ?? null;

  async function runCheck() {
    if (!escrow) return;
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(`/api/docket/${escrow.docketId}`);
      const body = (await res.json()) as ApiResult<DocketSnapshot>;
      if (!body.ok) {
        setCheckError({ code: body.error, hint: body.hint || `Docket read failed with status ${res.status}.` });
        return;
      }
      const fresh = body.data;
      setFreshDocket(fresh);

      // Live path: the desk only reads. The timeline comes from the chain, and
      // only the CRE workflow's signed report can release.
      if (isLiveChain && !escrow.local) return;

      const verdict = evaluateCondition(escrow, fresh);
      const now = new Date().toISOString();
      const events: EscrowEvent[] = [
        { kind: "checked", at: now, txHash: mockTxHash(`check-${escrow.id}-${now}`), note: `Desk check: ${verdict.reason}` },
      ];
      // Mock path only: play the CRE step so the release can be rehearsed.
      const release = verdict.met && escrow.status === "locked" && !isLiveChain;
      if (release) {
        events.push({
          kind: "released",
          at: now,
          txHash: mockTxHash(`release-${escrow.id}-${now}`),
          note: `${escrow.amountEth} ETH released to ${escrow.onMet.label} (simulated CRE report).`,
        });
      }
      const next: Escrow = {
        ...escrow,
        status: release ? "released" : escrow.status,
        events: [...escrow.events, ...events],
      };
      setEscrow(next);
      if (next.local) saveLocalEscrow(next);
    } catch (err) {
      setCheckError({ code: null, hint: err instanceof Error ? err.message : "Docket check failed." });
    } finally {
      setChecking(false);
    }
  }

  if (!resolved) {
    return (
      <div className="mt-10 border border-dashed border-border bg-secondary p-6 text-muted-foreground">
        Opening escrow No. {escrowId}…
      </div>
    );
  }

  if (!escrow) return <EscrowEmptyState escrowId={escrowId} />;

  const verdict = docket ? evaluateCondition(escrow, docket) : null;
  const balanceNow = escrow.payeeBalanceEth ?? null;

  return (
    <article className="mt-8 space-y-12">
      <header className="decreta-seq space-y-4">
        <p className="decreta-label text-muted-foreground">
          Escrow No. {escrow.id} · {docket?.docketNumber ?? `docket ${escrow.docketId}`}
          {escrow.local && " · simulated in this browser"}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <h1 className="max-w-xl text-4xl font-semibold leading-tight">{docket?.caseName ?? `Docket ${escrow.docketId}`}</h1>
          <div key={escrow.status} className="decreta-rise pt-2">
            <Badge variant="stamp" className={STAMP_COLOR[escrow.status]} aria-live="polite">
              {STAMP_TEXT[escrow.status]}
            </Badge>
          </div>
        </div>
        {(balanceBefore || balanceNow) && (
          <p className="decreta-label text-muted-foreground" aria-live="polite">
            Plaintiff wallet: {eth(balanceBefore ?? balanceNow ?? "0")} ETH
            {balanceBefore && balanceNow && escrow.status === "released" && (
              <span key={balanceNow} className="decreta-rise inline-block text-ok">
                , now {eth(balanceNow)} ETH
              </span>
            )}
          </p>
        )}
        <p className="max-w-prose text-lg leading-relaxed">
          <span className="font-display text-2xl font-semibold tabular-nums">{escrow.amountEth} ETH</span>{" "}
          {conditionSentence(escrow).toLowerCase()}, paying {escrow.onMet.label}. If the court has not acted by{" "}
          {escrow.deadline}, anyone can refund it to {escrow.onExpiry.label}.
        </p>
        <p className="max-w-prose text-muted-foreground">{escrow.memo}</p>
        <p className="flex flex-wrap gap-x-6 text-sm">
          <Link
            href={`/escrows/compare?left=${escrow.id}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Compare with the open docket
          </Link>
        </p>
      </header>

      <section aria-labelledby="docket-heading" className="space-y-4">
        <h2 id="docket-heading" className="text-2xl font-semibold">
          The docket today
        </h2>
        {docket ? (
          <div className="border-l-4 border-primary bg-secondary p-5">
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                ["Court", docket.court],
                ["Nature of suit", docket.natureOfSuit],
                ["Filed", docket.dateFiled || "Not recorded"],
                ["Terminated", docket.dateTerminated ?? "Still open"],
                ["Last filing", docket.dateLastFiling ?? "Not recorded"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="decreta-label text-muted-foreground">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div>
                <dt className="decreta-label text-muted-foreground">Source</dt>
                <dd>
                  <a href={courtListenerUrl(docket.id)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    CourtListener docket {docket.id}
                  </a>
                </dd>
              </div>
            </dl>
            {verdict && (
              <p className={cn("mt-4 border-t border-border pt-4", verdict.met ? "text-ok" : "text-foreground")}>
                {verdict.met ? "Condition met. " : "Condition not met. "}
                {verdict.reason}
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No docket snapshot is stored for this escrow. Run a check to read it.</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button variant={escrow.status === "locked" ? "default" : "outline"} onClick={runCheck} disabled={checking}>
            {checking ? "Reading the docket…" : "Check the docket now"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {isLiveChain
              ? "Reads CourtListener. Releases only come from the CRE workflow's signed report."
              : "No contract set: a met condition plays the CRE release locally so you can rehearse it."}
          </span>
        </div>
        {checkError && (
          <ErrorState
            title="The docket check did not finish"
            hint={checkError.hint}
            code={checkError.code}
            onRetry={() => void runCheck()}
            retryLabel="Check again"
          />
        )}
      </section>

      <section aria-labelledby="record-heading" className="space-y-4">
        <h2 id="record-heading" className="text-2xl font-semibold">
          On-chain record
        </h2>
        <ol className="decreta-seq space-y-0 border-l-2 border-border">
          {escrow.events.map((ev, i) => (
            <li key={`${ev.kind}-${i}`} className="relative pb-6 pl-6 last:pb-0">
              <span
                aria-hidden
                className={cn(
                  "absolute -left-[7px] top-1.5 block size-3 border-2 bg-background",
                  ev.kind === "released" ? "border-ok bg-ok" : ev.kind === "refunded" ? "border-bad bg-bad" : "border-primary"
                )}
              />
              <p className="decreta-label text-muted-foreground">
                {EVENT_LABEL[ev.kind]} · {stampTime(ev.at)}
              </p>
              <p className="mt-1">{ev.note}</p>
              <p className="break-all text-sm text-muted-foreground" title={ev.txHash}>
                {isLiveChain && !escrow.local && !/^0x0+$/.test(ev.txHash) ? (
                  <a href={explorerTx(ev.txHash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    {shortHex(ev.txHash)} on Etherscan
                  </a>
                ) : (
                  <>tx {shortHex(ev.txHash)}</>
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
