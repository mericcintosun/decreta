import { BaseError, TimeoutError, createPublicClient, formatEther, http } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS, RETRY_COUNT, RPC_TIMEOUT_MS } from "@/lib/config";
import { escrows as seedEscrows } from "@/lib/data/seed";
import { fail, type ErrorCode } from "@/lib/errors";
import { checkedEvent, depositedEvent, escrowAbi, refundedEvent, releasedEvent } from "@/lib/escrow-abi";
import { coreLog } from "@/lib/log";
import { onChainEscrowSchema } from "@/lib/schemas";
import { escrowDeployBlock, sepoliaRpcUrl } from "@/lib/secrets";
import type { ApiResult, Escrow, EscrowEvent, EscrowStatus, EventKind, Hex } from "@/lib/types";

// Server only (reads lib/secrets.ts). DecretaEscrow reads on Sepolia: state
// through getEscrow, history through one getLogs per event kind.

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpcUrl() || undefined, { timeout: RPC_TIMEOUT_MS, retryCount: RETRY_COUNT }),
});

const STATUS: Record<number, EscrowStatus> = { 1: "locked", 2: "released", 3: "refunded" };

/** Marks an event known from state only; the record shows no explorer link for it. */
const ZERO_HASH = `0x${"0".repeat(64)}` as Hex;

function isoDay(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toISOString().slice(0, 10);
}

function rpcErrorCode(err: unknown): ErrorCode {
  if (err instanceof TimeoutError) return "upstream_timeout";
  if (err instanceof BaseError && err.walk((e) => e instanceof TimeoutError)) return "upstream_timeout";
  return "upstream_error";
}

/** The events contract state alone proves, without tx hashes or block times. */
export function stateEvents(escrow: Escrow): EscrowEvent[] {
  const at = new Date().toISOString();
  const events: EscrowEvent[] = [
    {
      kind: "deposited",
      at,
      txHash: ZERO_HASH,
      note: `${escrow.amountEth} ETH held against docket ${escrow.docketId}, per contract state. Event log not loaded.`,
    },
  ];
  if (escrow.status === "released") {
    events.push({ kind: "released", at, txHash: ZERO_HASH, note: `Released to ${escrow.onMet.label}, per contract state.` });
  }
  if (escrow.status === "refunded") {
    events.push({ kind: "refunded", at, txHash: ZERO_HASH, note: `Refunded to ${escrow.onExpiry.label}, per contract state.` });
  }
  return events;
}

export async function readEscrowCount(): Promise<ApiResult<number>> {
  if (!CONTRACT_ADDRESS) return fail("not_configured", "chain", "NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
  try {
    const count = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: escrowAbi, functionName: "escrowCount" });
    return { ok: true, data: Number(count), source: "chain" };
  } catch (err) {
    const code = rpcErrorCode(err);
    coreLog("escrow count failed", { code });
    return fail(code, "chain");
  }
}

/** getEscrow(id), parsed and mapped. Events are the state-derived ones; see readEscrowEvents. */
export async function readEscrow(id: number): Promise<ApiResult<Escrow>> {
  if (!CONTRACT_ADDRESS) return fail("not_configured", "chain", "NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");

  let raw: unknown;
  try {
    raw = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: escrowAbi,
      functionName: "getEscrow",
      args: [BigInt(id)],
    });
  } catch (err) {
    return fail(rpcErrorCode(err), "chain");
  }

  const parsed = onChainEscrowSchema.safeParse(raw);
  if (!parsed.success) return fail("parse_failure", "chain");
  const e = parsed.data;

  // Status 0 (None): the mapping slot was never written.
  const status = STATUS[e.status];
  if (!status) return fail("not_found", "chain", `Escrow ${id} does not exist on the contract.`);

  const docketId = Number(e.docketId);
  const seed = seedEscrows.find((s) => s.id === id && s.docketId === docketId);
  const escrow: Escrow = {
    id,
    docketId,
    condition: e.condition === 0 ? "terminated" : "filing-after",
    filedAfter: e.condition === 1 ? isoDay(e.filedAfter) : null,
    deadline: isoDay(e.deadline),
    amountEth: formatEther(e.amount),
    memo: seed?.memo ?? "Locked on Sepolia against this docket.",
    onMet: { label: seed?.onMet.label ?? "Payee when met", address: e.onMet },
    onExpiry: { label: seed?.onExpiry.label ?? "Refund address", address: e.onExpiry },
    status,
    events: [],
  };
  return { ok: true, data: { ...escrow, events: stateEvents(escrow) }, source: "chain" };
}

export interface EscrowHistory {
  events: EscrowEvent[];
  /** Amount from the Deposited log; getEscrow zeroes `amount` after release or refund. */
  depositedWei: bigint | null;
  degraded: boolean;
}

interface Entry {
  block: bigint;
  index: number;
  tx: Hex;
  kind: EventKind;
  note: string;
}

/**
 * Deposited, Checked, Released and Refunded for one escrow, oldest first, with
 * block times and real tx hashes. Falls back to stateEvents when
 * ESCROW_DEPLOY_BLOCK is unset or a getLogs call fails.
 */
export async function readEscrowEvents(id: number, escrow: Escrow): Promise<EscrowHistory> {
  const degraded = (reason: string): EscrowHistory => {
    coreLog("events degraded", { id, reason });
    return { events: stateEvents(escrow), depositedWei: null, degraded: true };
  };

  const fromBlock = escrowDeployBlock();
  if (!CONTRACT_ADDRESS) return degraded("no_contract");
  if (fromBlock === null) return degraded("no_deploy_block");
  const address = CONTRACT_ADDRESS;
  const args = { id: BigInt(id) };

  try {
    const [deposited, checked, released, refunded] = await Promise.all([
      publicClient.getLogs({ address, event: depositedEvent, args, fromBlock, strict: true }),
      publicClient.getLogs({ address, event: checkedEvent, args, fromBlock, strict: true }),
      publicClient.getLogs({ address, event: releasedEvent, args, fromBlock, strict: true }),
      publicClient.getLogs({ address, event: refundedEvent, args, fromBlock, strict: true }),
    ]);

    const entries: Entry[] = [
      ...deposited.map(
        (l): Entry => ({
          block: l.blockNumber ?? BigInt(0),
          index: l.logIndex ?? 0,
          tx: l.transactionHash ?? ZERO_HASH,
          kind: "deposited",
          note: `${formatEther(l.args.amount)} ETH locked against docket ${l.args.docketId}.`,
        })
      ),
      ...checked.map(
        (l): Entry => ({
          block: l.blockNumber ?? BigInt(0),
          index: l.logIndex ?? 0,
          tx: l.transactionHash ?? ZERO_HASH,
          kind: "checked",
          note: l.args.conditionMet
            ? `CRE check: condition met, docket event observed ${isoDay(l.args.observedAt)}.`
            : "CRE check: condition not met yet.",
        })
      ),
      ...released.map(
        (l): Entry => ({
          block: l.blockNumber ?? BigInt(0),
          index: l.logIndex ?? 0,
          tx: l.transactionHash ?? ZERO_HASH,
          kind: "released",
          note: `${formatEther(l.args.amount)} ETH released to ${escrow.onMet.label}.`,
        })
      ),
      ...refunded.map(
        (l): Entry => ({
          block: l.blockNumber ?? BigInt(0),
          index: l.logIndex ?? 0,
          tx: l.transactionHash ?? ZERO_HASH,
          kind: "refunded",
          note: `${formatEther(l.args.amount)} ETH refunded to ${escrow.onExpiry.label}.`,
        })
      ),
    ].sort((a, b) => (a.block === b.block ? a.index - b.index : a.block < b.block ? -1 : 1));

    if (entries.length === 0) return degraded("no_logs");

    const blockNumbers = [...new Set(entries.map((e) => e.block))];
    const stamps = new Map<bigint, bigint>(
      await Promise.all(
        blockNumbers.map(async (blockNumber) => {
          const block = await publicClient.getBlock({ blockNumber });
          return [blockNumber, block.timestamp] as const;
        })
      )
    );

    const events: EscrowEvent[] = entries.map((e) => ({
      kind: e.kind,
      at: new Date(Number(stamps.get(e.block) ?? BigInt(0)) * 1000).toISOString(),
      txHash: e.tx,
      note: e.note,
    }));

    coreLog("events read", { id, count: events.length });
    return { events, depositedWei: deposited[0]?.args.amount ?? null, degraded: false };
  } catch (err) {
    return degraded(rpcErrorCode(err));
  }
}
