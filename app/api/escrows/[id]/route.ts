import { NextResponse } from "next/server";
import { adapter } from "@/lib/adapter";
import type { ApiResult, Escrow } from "@/lib/types";

// One escrow as an ApiResult<Escrow>. Seed data until Phase 2 reads Sepolia.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const escrowId = Number(id);
  if (!Number.isSafeInteger(escrowId) || escrowId <= 0) {
    const body: ApiResult<Escrow> = {
      ok: false,
      status: 400,
      source: "seed",
      error: { code: "bad_id", message: "Escrow id must be a positive number." },
    };
    return NextResponse.json(body, { status: 400 });
  }

  const result = await adapter.getEscrow(escrowId);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
