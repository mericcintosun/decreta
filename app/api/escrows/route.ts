import { NextResponse } from "next/server";
import { adapter } from "@/lib/adapter";

// The escrow register as an ApiResult<Escrow[]>. Seed data until Phase 2 reads Sepolia.
export async function GET() {
  const result = await adapter.listEscrows();
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
