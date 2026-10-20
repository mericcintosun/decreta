"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { explorerTx, isLiveChain, readEscrowStatus } from "@/lib/chain";
import {
  conditionSentence,
  courtListenerUrl,
  evaluateCondition,
  loadLocalEscrows,
  mockTxHash,
  saveLocalEscrow,
  shortHex,
  type ApiResult,
  type DocketSnapshot,
  type Escrow,
  type EscrowEvent,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const POLL_MS = 15_000;

const STAMP_TEXT: Record<Escrow["status"], string> = {
  locked: "Locked",
  released: "Released",
  refunded: "Refunded",
};

const STAMP_COLOR: Record<Escrow["status"], string> = {
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

export function EscrowRecord({
  escrowId,
  seed,
  seedDocket,
}: {
  escrowId: number;
  seed: Escrow | null;
  seedDocket: DocketSnapshot | null;
}) {
  const [escrow, setEscrow] = useState<Escrow | null>(seed);
  const [docket, setDocket] = useState<DocketSnapshot | null>(seedDocket ?? seed?.docketSnapshot ?? null);
  const [resolved, setResolved] = useState(seed !== null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Escrows created on the mock path live in this browser only.
  useEffect(() => {
    if (seed) return;
    const local = loadLocalEscrows().find((e) => e.id === escrowId) ?? null;
    setEscrow(local);
    setDocket(local?.docketSnapshot ?? null);
    setResolved(true);
  }, [seed, escrowId]);

  // Live path: poll DecretaEscrow.getEscrow so a CRE release shows up without a reload.
  useEffect(() => {
    if (!isLiveChain || !escrow || escrow.local || escrow.status !== "locked") return;
    const timer = setInterval(async () => {
      const status = await readEscrowStatus(escrow.id);
      if (!status || status === "locked") return;
      setEscrow((prev) =>
        prev
          ? {
              ...prev,
              status,
              events: [
                ...prev.events,
                {
                  kind: status,
                  at: new Date().toISOString(),
                  txHash: prev.events[prev.events.length - 1].txHash,
                  note: status === "released" ? `Released to ${prev.onMet.label}.` : `Refunded to ${prev.onExpiry.label}.`,
                },
              ],
            }
          : prev
      );
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [escrow]);

  async function runCheck() {
    if (!escrow) return;
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(`/api/docket/${escrow.docketId}`);
      const body = (await res.json()) as ApiResult<DocketSnapshot>;
      if (!body.ok) throw new Error(body.error.message || `Docket read failed with status ${res.status}.`);
      const fresh = body.data;
      setDocket(fresh);

      const verdict = evaluateCondition(escrow, fresh);
      const now = new Date().toISOString();
      const events: EscrowEvent[] = [
        { kind: "checked", at: now, txHash: mockTxHash(`check-${escrow.id}-${now}`), note: `Desk check: ${verdict.reason}` },
      ];
      // On the live chain only the CRE forwarder can release; the desk just reads.
      // On the mock path we play the CRE step so the release can be rehearsed.
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
      setCheckError(err instanceof Error ? err.message : "Docket check failed.");
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

  if (!escrow) {
    return (
      <Card className="mt-10 text-center">
        <CardContent className="space-y-4 pt-6">
          <Image
            src="/illustrations/docket-sheet.svg"
            alt="A ruled docket sheet with a rust TERMINATED stamp"
            width={320}
            height={150}
            className="mx-auto opacity-70"
            unoptimized
          />
          <h1 className="text-2xl font-semibold">No escrow No. {escrowId} on this desk</h1>
          <p className="text-muted-foreground">
            It is not in the demo register, and this browser has no locally created escrow with that number.
          </p>
          <Button asChild variant="outline">
            <Link href="/escrows">See the register</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const verdict = docket ? evaluateCondition(escrow, docket) : null;

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
        <p className="max-w-prose text-lg leading-relaxed">
          <span className="font-display text-2xl font-semibold tabular-nums">{escrow.amountEth} ETH</span>{" "}
          {conditionSentence(escrow).toLowerCase()}, paying {escrow.onMet.label}. If the court has not acted by{" "}
          {escrow.deadline}, anyone can refund it to {escrow.onExpiry.label}.
        </p>
        <p className="max-w-prose text-muted-foreground">{escrow.memo}</p>
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
          <p role="alert" className="border-l-4 border-bad bg-secondary p-3 text-sm">
            {checkError}
          </p>
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
              <p className="text-sm text-muted-foreground">
                {isLiveChain && !escrow.local && ev.kind !== "checked" ? (
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
