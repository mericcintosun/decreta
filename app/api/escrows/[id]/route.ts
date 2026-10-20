import { NextResponse } from "next/server";
import { adapter, adapterMode } from "@/lib/adapter";
import { fail } from "@/lib/errors";
import { escrowIdParam } from "@/lib/schemas";

// One escrow as an ApiResult<Escrow>: seed in fake mode, DecretaEscrow on Sepolia in real mode.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = escrowIdParam.safeParse((await params).id);
  if (!parsed.success) {
    const body = fail("invalid_input", adapterMode === "real" ? "chain" : "seed", "Escrow id must be a positive whole number.");
    return NextResponse.json(body, { status: body.status });
  }

  const result = await adapter.getEscrow(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
