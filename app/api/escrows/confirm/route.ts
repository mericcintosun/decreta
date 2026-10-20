import { NextResponse } from "next/server";
import { fail } from "@/lib/errors";
import { readDepositReceipt } from "@/lib/escrow-chain";
import { confirmLockBody } from "@/lib/schemas";
import type { ApiResult, Hex } from "@/lib/types";

// POST { txHash } after the browser wallet sent createEscrow. Answers with the
// escrow id from the mined receipt's Deposited log, as ApiResult<{ escrowId, txHash }>.
//   not_found       the receipt is not mined yet; the client asks again
//   upstream_error  the tx reverted, or it has no Deposited log from DecretaEscrow
//   not_configured  NEXT_PUBLIC_CONTRACT_ADDRESS is not set

type Confirmed = { escrowId: number; txHash: Hex };

/** Mined receipts never change, so one answer per hash is final for this server instance. */
const confirmedByTxHash = new Map<Hex, Confirmed>();

/** A retry or a double submit of the same hash returns the same escrow id. */
async function idempotentConfirm(txHash: Hex): Promise<ApiResult<Confirmed>> {
  const known = confirmedByTxHash.get(txHash);
  if (known) return { ok: true, data: known, source: "chain" };

  const result = await readDepositReceipt(txHash);
  if (result.ok) confirmedByTxHash.set(txHash, result.data);
  return result;
}

export async function POST(req: Request) {
  let raw: unknown = null;
  try {
    raw = await req.json();
  } catch {
    // An empty or non-JSON body fails the parse below.
  }

  const parsed = confirmLockBody.safeParse(raw);
  if (!parsed.success) {
    const body = fail("invalid_input", "chain", "Send { txHash } with a 0x-prefixed 32 byte transaction hash.");
    return NextResponse.json(body, { status: body.status });
  }

  const result = await idempotentConfirm(parsed.data.txHash);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
