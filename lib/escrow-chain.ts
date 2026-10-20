import {
  BaseError,
  TimeoutError,
  TransactionReceiptNotFoundError,
  createPublicClient,
  formatEther,
  http,
  isAddressEqual,
  parseEventLogs,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS, LOG_WINDOW_BLOCKS, RETRY_COUNT, RPC_TIMEOUT_MS } from "@/lib/config";
import { escrows as seedEscrows } from "@/lib/data/seed";
import { fail, type ErrorCode } from "@/lib/errors";
import { checkedEvent, depositedEvent, escrowAbi, refundedEvent, releasedEvent } from "@/lib/escrow-abi";
import { coreLog } from "@/lib/log";
import { onChainEscrowSchema } from "@/lib/schemas";
import { escrowDeployBlock, sepoliaRpcUrl } from "@/lib/secrets";
import type { ApiResult, Escrow, EscrowEvent, EscrowStatus, EventKind, Hex } from "@/lib/types";

// Server only (reads lib/secrets.ts). DecretaEscrow reads on Sepolia: state
// through getEscrow, history through getLogs in windows of LOG_WINDOW_BLOCKS,
// lock receipts for /api/escrows/confirm, and the payee balance.
// The keyed RPC client has RPC_TIMEOUT_MS and RETRY_COUNT (one retry).

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpcUrl() || undefined, { timeout: RPC_TIMEOUT_MS, retryCount: RETRY_COUNT }),
});

const STATUS: Record<number, EscrowStatus> = { 1: "locked", 2: "released", 3: "refunded" };

/** Marks an event known from state only; the record shows no explorer link for it. */
const ZERO_HASH = `0x${"0".repeat(64)}` as Hex;

/** Blocks behind the head before a scanned window is cached as final. */
const CONFIRMATIONS = BigInt(3);

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

/** Balance in ETH, or null when the RPC does not answer. */
export async function readBalanceEth(address: Address): Promise<string | null> {
  try {
    return formatEther(await publicClient.getBalance({ address }));
  } catch (err) {
    coreLog("balance read failed", { code: rpcErrorCode(err) });
    return null;
  }
}

/**
 * The Deposited id from a createEscrow receipt. Derived only from the mined,
 * immutable receipt, so asking twice for one hash gives the same answer.
 */
export async function readDepositReceipt(txHash: Hex): Promise<ApiResult<{ escrowId: number; txHash: Hex }>> {
  if (!CONTRACT_ADDRESS) return fail("not_configured", "chain", "NEXT_PUBLIC_CONTRACT_ADDRESS is not set.");
  const address = CONTRACT_ADDRESS;

  let receipt: Awaited<ReturnType<typeof publicClient.getTransactionReceipt>>;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  } catch (err) {
    if (
      err instanceof TransactionReceiptNotFoundError ||
      (err instanceof BaseError && err.walk((e) => e instanceof TransactionReceiptNotFoundError))
    ) {
      return fail("not_found", "chain", "The lock transaction is not mined yet. Ask again in a few seconds.");
    }
    const code = rpcErrorCode(err);
    coreLog("receipt read failed", { code });
    return fail(code, "chain");
  }

  if (receipt.status !== "success") {
    coreLog("receipt reverted", { block: receipt.blockNumber.toString() });
    return fail("upstream_error", "chain", "The lock transaction reverted on Sepolia. No funds were locked.");
  }

  const ours = receipt.logs.filter((l) => isAddressEqual(l.address, address));
  const [deposited] = parseEventLogs({ abi: escrowAbi, logs: ours, eventName: "Deposited" });
  if (!deposited) {
    return fail("upstream_error", "chain", "The transaction has no Deposited event from DecretaEscrow.");
  }

  const escrowId = Number(deposited.args.id);
  coreLog("lock confirmed", { escrowId });
  return { ok: true, data: { escrowId, txHash }, source: "chain" };
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
  amount: bigint | null;
}

/**
 * Logs are immutable once a window is CONFIRMATIONS deep, so each escrow keeps
 * the entries found so far and the next block to scan. A 5 s record poll then
 * scans only the new tail instead of the whole range from the deploy block.
 * Per server instance, in memory; a cold start rescans.
 */
const historyCache = new Map<number, { next: bigint; entries: Entry[] }>();
const blockTimes = new Map<bigint, bigint>();

async function scanWindow(address: Address, id: number, escrow: Escrow, fromBlock: bigint, toBlock: bigint): Promise<Entry[]> {
  const args = { id: BigInt(id) };
  const [deposited, checked, released, refunded] = await Promise.all([
    publicClient.getLogs({ address, event: depositedEvent, args, fromBlock, toBlock, strict: true }),
    publicClient.getLogs({ address, event: checkedEvent, args, fromBlock, toBlock, strict: true }),
    publicClient.getLogs({ address, event: releasedEvent, args, fromBlock, toBlock, strict: true }),
    publicClient.getLogs({ address, event: refundedEvent, args, fromBlock, toBlock, strict: true }),
  ]);

  return [
    ...deposited.map(
      (l): Entry => ({
        block: l.blockNumber ?? BigInt(0),
        index: l.logIndex ?? 0,
        tx: l.transactionHash ?? ZERO_HASH,
        kind: "deposited",
        note: `${formatEther(l.args.amount)} ETH locked against docket ${l.args.docketId}.`,
        amount: l.args.amount,
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
        amount: null,
      })
    ),
    ...released.map(
      (l): Entry => ({
        block: l.blockNumber ?? BigInt(0),
        index: l.logIndex ?? 0,
        tx: l.transactionHash ?? ZERO_HASH,
        kind: "released",
        note: `${formatEther(l.args.amount)} ETH released to ${escrow.onMet.label}.`,
        amount: l.args.amount,
      })
    ),
    ...refunded.map(
      (l): Entry => ({
        block: l.blockNumber ?? BigInt(0),
        index: l.logIndex ?? 0,
        tx: l.transactionHash ?? ZERO_HASH,
        kind: "refunded",
        note: `${formatEther(l.args.amount)} ETH refunded to ${escrow.onExpiry.label}.`,
        amount: l.args.amount,
      })
    ),
  ];
}

/**
 * Deposited, Checked, Released and Refunded for one escrow, oldest first, with
 * block times and real tx hashes. Scans from ESCROW_DEPLOY_BLOCK in windows of
 * at most LOG_WINDOW_BLOCKS, filtered by the indexed id. Falls back to
 * stateEvents when ESCROW_DEPLOY_BLOCK is unset or a getLogs call fails.
 */
export async function readEscrowEvents(id: number, escrow: Escrow): Promise<EscrowHistory> {
  const degraded = (reason: string): EscrowHistory => {
    coreLog("events degraded", { id, reason });
    return { events: stateEvents(escrow), depositedWei: null, degraded: true };
  };

  const deployBlock = escrowDeployBlock();
  if (!CONTRACT_ADDRESS) return degraded("no_contract");
  if (deployBlock === null) return degraded("no_deploy_block");
  const address = CONTRACT_ADDRESS;

  try {
    const latest = await publicClient.getBlockNumber();
    const cached = historyCache.get(id) ?? { next: deployBlock, entries: [] };
    const span = BigInt(LOG_WINDOW_BLOCKS);

    const fresh: Entry[] = [];
    let windows = 0;
    for (let from = cached.next; from <= latest; from += span) {
      const to = from + span - BigInt(1) < latest ? from + span - BigInt(1) : latest;
      fresh.push(...(await scanWindow(address, id, escrow, from, to)));
      windows++;
    }

    const entries = [...cached.entries, ...fresh].sort((a, b) =>
      a.block === b.block ? a.index - b.index : a.block < b.block ? -1 : 1
    );

    const safe = latest - CONFIRMATIONS;
    if (safe >= cached.next) {
      historyCache.set(id, { next: safe + BigInt(1), entries: entries.filter((e) => e.block <= safe) });
    }

    if (entries.length === 0) return degraded("no_logs");

    const missing = [...new Set(entries.map((e) => e.block))].filter((b) => !blockTimes.has(b));
    await Promise.all(
      missing.map(async (blockNumber) => {
        const block = await publicClient.getBlock({ blockNumber });
        blockTimes.set(blockNumber, block.timestamp);
      })
    );

    const events: EscrowEvent[] = entries.map((e) => ({
      kind: e.kind,
      at: new Date(Number(blockTimes.get(e.block) ?? BigInt(0)) * 1000).toISOString(),
      txHash: e.tx,
      note: e.note,
    }));

    coreLog("events read", { id, count: events.length, windows });
    const deposit = entries.find((e) => e.kind === "deposited");
    return { events, depositedWei: deposit?.amount ?? null, degraded: false };
  } catch (err) {
    return degraded(rpcErrorCode(err));
  }
}
