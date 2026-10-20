"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { EmptyState, ErrorState } from "@/components/state-triad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WalletPanel } from "@/components/wallet-panel";
import { explorerTx, isLiveChain, lockFunds } from "@/lib/chain";
import { DEMO_PLAINTIFF } from "@/lib/config";
import type { ErrorCode } from "@/lib/errors";
import { useWallet } from "@/lib/use-wallet";
import { canSend } from "@/lib/wallet-state";
import {
  conditionSentence,
  courtListenerUrl,
  evaluateCondition,
  loadLocalEscrows,
  mockAddress,
  parseDocketInput,
  saveLocalEscrow,
  shortHex,
  type ApiResult,
  type ConditionKind,
  type DataSource,
  type DocketSnapshot,
  type Escrow,
  type EscrowStatus,
  type Hex,
} from "@/lib/data";
import { cn } from "@/lib/utils";

type Preview =
  | { state: "idle" }
  | { state: "loading"; id: number }
  | { state: "ready"; docket: DocketSnapshot; source: DataSource }
  | { state: "error"; message: string; code?: ErrorCode };

type Filter = "all" | EscrowStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "locked", label: "Locked" },
  { key: "released", label: "Released" },
  { key: "refunded", label: "Refunded" },
];

const fieldLabel = "decreta-label mb-1.5 block text-muted-foreground";

/** The closed demo docket; the empty register offers to read it. */
const CLOSED_DOCKET = "68519034";

/** The register could not be read on the server. Retries the server render. */
export function RegisterErrorState({ hint }: { hint: string }) {
  const router = useRouter();
  return <ErrorState title="The register could not be read" hint={hint} onRetry={() => router.refresh()} />;
}

function DocketErrorState({ message, code, onRetry }: { message: string; code?: ErrorCode; onRetry: () => void }) {
  return <ErrorState title="The docket could not be read" hint={message} code={code} onRetry={onRetry} retryLabel="Read again" />;
}

function RegisterEmptyState({ onRead, onShowAll }: { onRead: () => void; onShowAll: () => void }) {
  return (
    <EmptyState
      title="No escrows with this status."
      body="Start one: read the closed demo docket and lock against it."
      action={
        <>
          <Button size="sm" onClick={onRead}>
            Read docket {CLOSED_DOCKET}
          </Button>
          <Button variant="outline" size="sm" onClick={onShowAll}>
            Show all
          </Button>
        </>
      }
    />
  );
}

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
  const [onMet, setOnMet] = useState<string>(isLiveChain ? (DEMO_PLAINTIFF ?? "") : mockAddress("demo plaintiff"));
  const [onExpiry, setOnExpiry] = useState<string>(isLiveChain ? "" : mockAddress("demo defendant"));
  const [deadline, setDeadline] = useState("2027-04-30");
  const [confirmed, setConfirmed] = useState<{ escrow: Escrow; mode: "chain" | "mock" } | null>(null);
  const [localEscrows, setLocalEscrows] = useState<Escrow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const wallet = useWallet();
  const { state } = wallet;
  const account = "account" in state && isLiveChain ? state.account : null;

  useEffect(() => {
    setLocalEscrows(loadLocalEscrows());
  }, []);

  // Live path: the refund address defaults to the wallet that deposits.
  useEffect(() => {
    if (account) setOnExpiry((prev) => prev || account);
  }, [account]);

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
      const body = (await res.json()) as ApiResult<DocketSnapshot>;
      if (!body.ok) {
        setPreview({ state: "error", message: body.hint || `Lookup failed with status ${res.status}.`, code: body.error });
        return;
      }
      setPreview({ state: "ready", docket: body.data, source: body.source });
    } catch {
      setPreview({ state: "error", message: "Network error while reaching the docket service." });
    }
  }

  const docket = preview.state === "ready" ? preview.docket : null;
  const amountOk = Number(amount) > 0;
  const addressesOk = isAddress(onMet) && isAddress(onExpiry);
  const datesOk = deadline > "2026-10-20" && (condition === "terminated" || Boolean(filedAfter));
  const canLock = Boolean(docket) && amountOk && addressesOk && datesOk && canSend(state);
  const busy = state.status === "tx-pending" || state.status === "connecting";
  const precheck = docket ? evaluateCondition({ condition, filedAfter }, docket) : null;

  async function submit() {
    if (!docket || !canSend(state)) return;
    wallet.startTx();
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
        nextId,
        { onSent: wallet.txSent }
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
      // On the live path this runs only after /api/escrows/confirm answered ok.
      wallet.txConfirmed(receipt.txHash, receipt.escrowId);
    } catch (err) {
      wallet.txError(err);
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
              : "Demo mode: lookups use the ten demo dockets."}{" "}
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
                    { id: 68519034, hint: "closed" },
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
              <DocketErrorState message={preview.message} code={preview.code} onRetry={() => void lookup(docketInput)} />
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

            <div className="space-y-4 border-t border-border pt-6">
              <WalletPanel wallet={wallet} />
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  disabled={state.status === "tx-pending" || state.status === "connecting" || !canLock}
                  onClick={submit}
                >
                  {state.status === "tx-pending" ? "Locking…" : `Lock ${amountOk ? amount : ""} ETH`}
                </Button>
                {!docket && <span className="text-sm text-muted-foreground">Read a docket first.</span>}
                {docket && !busy && !canSend(state) && (
                  <span className="text-sm text-muted-foreground">Connect the wallet on Sepolia first.</span>
                )}
              </div>
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
          <RegisterEmptyState
            onRead={() => {
              setDocketInput(CLOSED_DOCKET);
              void lookup(CLOSED_DOCKET);
              document.getElementById("open-escrow")?.scrollIntoView({ behavior: "smooth" });
            }}
            onShowAll={() => setFilter("all")}
          />
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
