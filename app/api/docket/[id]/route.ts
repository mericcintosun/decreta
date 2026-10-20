import { NextResponse } from "next/server";
import { adapter, adapterMode } from "@/lib/adapter";
import type { ApiResult, DocketSnapshot } from "@/lib/types";

// Server-side docket preview so the CourtListener token stays off the client.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docketId = Number(id);
  if (!Number.isSafeInteger(docketId) || docketId <= 0) {
    const body: ApiResult<DocketSnapshot> = {
      ok: false,
      status: 400,
      source: adapterMode === "real" ? "courtlistener" : "seed",
      error: { code: "bad_id", message: "Docket id must be a positive number." },
    };
    return NextResponse.json(body, { status: 400 });
  }

  const result = await adapter.getDocket(docketId);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
