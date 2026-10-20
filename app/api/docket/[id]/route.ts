import { NextResponse } from "next/server";
import { getDocket } from "@/lib/courtlistener";

// Server-side docket preview so the CourtListener token stays off the client.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docketId = Number(id);
  if (!Number.isSafeInteger(docketId) || docketId <= 0) {
    return NextResponse.json({ error: "Docket id must be a positive number." }, { status: 400 });
  }

  const lookup = await getDocket(docketId);
  if (!lookup.ok) {
    return NextResponse.json({ error: lookup.message, source: lookup.source }, { status: lookup.status });
  }
  return NextResponse.json({ docket: lookup.docket, source: lookup.source });
}
