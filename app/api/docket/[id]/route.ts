import { NextResponse } from "next/server";
import { adapter, adapterMode } from "@/lib/adapter";
import { fail } from "@/lib/errors";
import { docketIdParam } from "@/lib/schemas";

// Server-side docket preview so the CourtListener token stays off the client.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = docketIdParam.safeParse((await params).id);
  if (!parsed.success) {
    const body = fail(
      "invalid_input",
      adapterMode === "real" ? "courtlistener" : "seed",
      "Docket id must be a positive whole number."
    );
    return NextResponse.json(body, { status: body.status });
  }

  const result = await adapter.getDocket(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status });
}
