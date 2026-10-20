"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { explorerTx, isLiveChain, lockFunds } from "@/lib/chain";
import {
  conditionSentence,
  courtListenerUrl,
  evaluateCondition,
  loadLocalEscrows,
  mockAddress,
  parseDocketInput,
  saveLocalEscrow,
  shortHex,
  type ConditionKind,
  type DocketSnapshot,
  type Escrow,
  type EscrowStatus,
  type Hex,
} from "@/lib/data";
import { cn } from "@/lib/utils";

type Preview =
  | { state: "idle" }
  | { state: "loading"; id: number }
  | { state: "ready"; docket: DocketSnapshot; source: "courtlistener" | "seed" }
  | { state: "error"; message: string };

type Filter = "all" | EscrowStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "locked", label: "Locked" },
  { key: "released", label: "Released" },
  { key: "refunded", label: "Refunded" },
];

const fieldLabel = "decreta-label mb-1.5 block text-muted-foreground";

export function EscrowConsole({
  seedEscrows,
  seedDockets,
  liveDockets,
}: {
  seedEscrows: Escrow[];
  seedDockets: DocketSnapshot[];
  liveDockets: boolean;
}) {
  const [docketInput, setDocketInput] = useState("");
  const [preview, setPreview] = useState<Preview>({ state: "idle" });
  const [condition, setCondition] = useState<ConditionKind>("terminated");
  const [filedAfter, setFiledAfter] = useState("2026-10-20");
  const [amount, setAmount] = useState("0.01");
  const [onMet, setOnMet] = useState<string>(isLiveChain ? "" : mockAddress("demo plaintiff"));
  const [onExpiry, setOnExpiry] = useState<string>(isLiveChain ? "" : mockAddress("demo defendant"));
  const [deadline, setDeadline] = useState("2027-04-30");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ escrow: Escrow; mode: "chain" | "mock" } | null>(null);
  const [localEscrows, setLocalEscrows] = useState<Escrow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setLocalEscrows(loadLocalEscrows());
  }, []);

  const allEscrows = useMemo(() => [...localEscrows, ...seedEscrows], [localEscrows, seedEscrows]);
  const docketById = useMemo(() => new Map(seedDockets.map((d) => [d.id, d])), [seedDockets]);
  const visible = allEscrows.filter((e) => filter === "all" || e.status === filter);

  async function lookup(raw: string) {
    const id = parseDocketInput(raw);
    if (!id) {
      setPreview({ state: "error", message: "Paste a CourtListener docket link (courtlistener.com/docket/...) or a numeric docket id." });
      return;
    }
    setPreview({ state: "loading", id });
    try {
      const res = await fetch(`/api/docket/${id}`);
      const body = (await res.json()) as { docket?: DocketSnapshot; source?: "courtlistener" | "seed"; error?: string };
      if (!res.ok || !body.docket) {
        setPreview({ state: "error", message: body.error ?? `Lookup failed with status ${res.status}.` });
        return;
      }
      setPreview({ state: "ready", docket: body.docket, source: body.source ?? "seed" });
    } catch {
      setPreview({ state: "error", message: "Network error while reaching the docket service." });
    }
  }

  const docket = preview.state === "ready" ? preview.docket : null;
  const amountOk = Number(amount) > 0;
  const addressesOk = isAddress(onMet) && isAddress(onExpiry);
  const datesOk = deadline > "2026-10-20" && (condition === "terminated" || Boolean(filedAfter));
  const canLock = Boolean(docket) && amountOk && addressesOk && datesOk && !submitting;
  const precheck = docket ? evaluateCondition({ condition, filedAfter }, docket) : null;

  async function submit() {
    if (!docket) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const nextId = Math.max(100, ...allEscrows.map((e) => e.id)) + 1;
      const receipt = await lockFunds(
        {
          docketId: docket.id,
          condition,
          filedAfter: condition === "filing-after" ? filedAfter : null,
          deadline,
          amountEth: amount,
          onMet: onMet as Hex,
          onExpiry: onExpiry as Hex,
        },
        nextId
      );
      const escrow: Escrow = {
        id: receipt.escrowId,
        docketId: docket.id,
        condition,
        filedAfter: condition === "filing-after" ? filedAfter : null,
        deadline,
        amountEth: amount,
        memo: "Created from the escrow desk.",
        onMet: { label: "Payee", address: onMet as Hex },
        onExpiry: { label: "Refund address", address: onExpiry as Hex },
        status: "locked",
        local: receipt.mode === "mock",
        docketSnapshot: docket,
        events: [
          {
            kind: "deposited",
            at: new Date().toISOString(),
            txHash: receipt.txHash,
            note: `${amount} ETH locked against docket ${docket.docketNumber}.`,
          },
        ],
      };
      if (receipt.mode === "mock") saveLocalEscrow(escrow);
      setLocalEscrows((prev) => [escrow, ...prev.filter((e) => e.id !== escrow.id)]);
      setConfirmed({ escrow, mode: receipt.mode });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "The transaction did not go through.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-16">
      <section aria-labelledby="open-escrow" className="space-y-6">
        <div className="space-y-2">
          <h2 id="open-escrow" className="text-3xl font-semibold">
            Open an escrow
          </h2>
          <p className="max-w-prose text-muted-foreground">
            {liveDockets
              ? "Docket lookups go to CourtListener live."
              : "No CourtListener token is set, so lookups use the ten demo dockets."}{" "}
            {isLiveChain ? "Locking sends a real Sepolia transaction from your wallet." : "No contract address is set, so locking is simulated in this browser."}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <label htmlFor="docket" className={fieldLabel}>
                CourtListener docket link or id
              </label>
              <div className="flex gap-2">
                <Input
                  id="docket"
                  value={docketInput}
                  placeholder="https://www.courtlistener.com/docket/68519034/"
                  onChange={(e) => setDocketInput(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    setDocketInput(text);
                    e.preventDefault();
                    void lookup(text);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void lookup(docketInput);
                  }}
                />
                <Button variant="outline" onClick={() => lookup(docketInput)} disabled={preview.state === "loading"}>
                  {preview.state === "loading" ? "Reading…" : "Read docket"}
                </Button>
              </div>
              {!liveDockets && (
                <div className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                  Try
                  {[
                    { id: 73388204, hint: "closed" },
                    { id: 69102877, hint: "open" },
                  ].map((s) => (
                    <Button
                      key={s.id}
                      variant="link"
                      size="sm"
                      className="h-auto px-1"
                      onClick={() => {
                        setDocketInput(String(s.id));
                        void lookup(String(s.id));
                      }}
                    >
                      {s.id} ({s.hint})
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {preview.state === "loading" && (
              <div className="border border-dashed border-border bg-secondary p-4 text-sm text-muted-foreground">
                Reading docket {preview.id}…
              </div>
            )}
            {preview.state === "error" && (
              <div role="alert" className="border-l-4 border-bad bg-secondary p-4 text-sm">
                {preview.message}
              </div>
            )}
            {docket && preview.state === "ready" && (
              <div className="decreta-rise border-l-4 border-primary bg-secondary p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold">{docket.caseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {docket.docketNumber} · {docket.court}
                    </p>
                  </div>
                  <Badge variant={docket.dateTerminated ? "released" : "locked"}>
                    {docket.dateTerminated ? "Terminated" : "Open"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm">
                  Filed {docket.dateFiled}. {docket.dateTerminated ? `Terminated ${docket.dateTerminated}. ` : ""}
                  Last filing {docket.dateLastFiling ?? "not recorded"}. {docket.natureOfSuit}.{" "}
                  <a href={courtListenerUrl(docket.id)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    View on CourtListener
                  </a>
                  {preview.source === "seed" && <span className="text-muted-foreground"> (demo record)</span>}
                </p>
              </div>
            )}

            <div>
              <span className={fieldLabel}>Release condition</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={condition === "terminated" ? "default" : "outline"}
                  aria-pressed={condition === "terminated"}
                  onClick={() => setCondition("terminated")}
                >
                  Case is terminated
                </Button>
                <Button
                  variant={condition === "filing-after" ? "default" : "outline"}
                  aria-pressed={condition === "filing-after"}
                  onClick={() => setCondition("filing-after")}
                >
                  New filing after a date
                </Button>
              </div>
              {condition === "filing-after" && (
                <div className="mt-3 max-w-xs">
                  <label htmlFor="filed-after" className={fieldLabel}>
                    Filing must be dated after
                  </label>
                  <Input id="filed-after" type="date" value={filedAfter} onChange={(e) => setFiledAfter(e.target.value)} />
                </div>
              )}
              {precheck && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Against today&apos;s docket: {precheck.reason} {precheck.met ? "The first CRE check after locking will release the funds." : "Funds stay locked until that changes."}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="amount" className={fieldLabel}>
                  Amount (Sepolia ETH)
                </label>
                <Input id="amount" type="number" min="0" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label htmlFor="deadline" className={fieldLabel}>
                  Refund if unmet by
                </label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div>
                <label htmlFor="on-met" className={fieldLabel}>
                  Pays to when met
                </label>
                <Input id="on-met" value={onMet} placeholder="0x… plaintiff wallet" onChange={(e) => setOnMet(e.target.value.trim())} />
              </div>
              <div>
                <label htmlFor="on-expiry" className={fieldLabel}>
                  Refunds to after deadline
                </label>
                <Input id="on-expiry" value={onExpiry} placeholder="0x… depositor wallet" onChange={(e) => setOnExpiry(e.target.value.trim())} />
              </div>
            </div>
            {(onMet || onExpiry) && !addressesOk && (
              <p className="text-sm text-bad">Both wallets must be valid 0x addresses.</p>
            )}

            <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
              <Button size="lg" disabled={!canLock} onClick={submit}>
                {submitting ? "Locking…" : `Lock ${amountOk ? amount : ""} ETH`}
              </Button>
              {!docket && <span className="text-sm text-muted-foreground">Read a docket first.</span>}
              {submitError && (
                <span role="alert" className="text-sm text-bad">
                  {submitError}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {confirmed && (
          <Card className="decreta-rise border-ok">
            <CardHeader>
              <CardTitle>Escrow No. {confirmed.escrow.id} is locked</CardTitle>
              <CardDescription>
                {conditionSentence(confirmed.escrow)}.{" "}
                {confirmed.mode === "chain" ? (
                  <a href={explorerTx(confirmed.escrow.events[0].txHash)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                    Deposited event on Etherscan
                  </a>
                ) : (
                  <>Simulated receipt {shortHex(confirmed.escrow.events[0].txHash)}.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={`/escrows/${confirmed.escrow.id}`}>Open its record</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="register" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="register" className="text-3xl font-semibold">
            Docket register
          </h2>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => {
              const count = allEscrows.filter((e) => f.key === "all" || e.status === f.key).length;
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "secondary" : "ghost"}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(filter === f.key && "border border-border")}
                >
                  {f.label} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <Card className="text-center">
            <CardContent className="space-y-3 pt-6">
              <Image src="/illustrations/docket-sheet.svg" alt="" width={320} height={150} className="mx-auto opacity-70" unoptimized />
              <p className="font-display text-lg">No escrows with this status.</p>
              <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                Show all
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="decreta-seq divide-y divide-border border-y border-border">
            {visible.map((e) => {
              const d = e.docketSnapshot ?? docketById.get(e.docketId);
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="decreta-label text-muted-foreground">
                      No. {e.id} · {d?.docketNumber ?? `docket ${e.docketId}`}
                      {e.local && " · this browser"}
                    </p>
                    <Link href={`/escrows/${e.id}`} className="font-display text-lg font-semibold underline-offset-4 hover:underline">
                      {d?.caseName ?? `Docket ${e.docketId}`}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {conditionSentence(e)}. Pays {e.onMet.label}.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-lg tabular-nums">{e.amountEth} ETH</span>
                    <Badge variant={e.status}>{e.status}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
