import { NextResponse } from "next/server";
import { adapter, adapterMode } from "@/lib/adapter";
import { fail } from "@/lib/errors";
import { escrowListQuery } from "@/lib/schemas";

// The escrow register as an ApiResult<Escrow[]>, optionally filtered by ?status=.
// Seed in fake mode, DecretaEscrow on Sepolia in real mode.
export async function GET(req: Request) {
  const parsed = escrowListQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    const body = fail("invalid_input", adapterMode === "real" ? "chain" : "seed", "Status must be locked, released or refunded.");
    return NextResponse.json(body, { status: body.status });
  }

  const result = await adapter.listEscrows();
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  const { status } = parsed.data;
  const data = status ? result.data.filter((e) => e.status === status) : result.data;
  return NextResponse.json({ ...result, data });
}
