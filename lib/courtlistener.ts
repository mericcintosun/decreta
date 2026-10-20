import { COURT_NAMES, findDocket } from "@/lib/data";
import type { DocketSnapshot, DocketSource } from "@/lib/types";

// CourtListener REST API v4 adapter (server side only, the token never ships
// to the browser). Same function, two paths:
//   1. COURTLISTENER_API_TOKEN set: real GET /api/rest/v4/dockets/{id}/
//   2. not set: the seed dockets in lib/data.ts
// The CRE workflow reads the same endpoint and the same two fields
// (date_terminated, date_last_filing) inside the DON.

const API_BASE = "https://www.courtlistener.com/api/rest/v4";

export type DocketLookup =
  | { ok: true; docket: DocketSnapshot; source: DocketSource }
  | { ok: false; status: number; message: string; source: DocketSource };

interface CourtListenerDocket {
  id: number;
  case_name: string | null;
  case_name_short?: string | null;
  docket_number: string | null;
  court_id: string;
  nature_of_suit: string | null;
  date_filed: string | null;
  date_terminated: string | null;
  date_last_filing: string | null;
}

export function hasLiveCourtListener(): boolean {
  return Boolean(process.env.COURTLISTENER_API_TOKEN);
}

function toSnapshot(raw: CourtListenerDocket): DocketSnapshot {
  return {
    id: raw.id,
    caseName: raw.case_name || raw.case_name_short || `Docket ${raw.id}`,
    docketNumber: raw.docket_number ?? "unnumbered",
    courtId: raw.court_id,
    court: COURT_NAMES[raw.court_id] ?? raw.court_id.toUpperCase(),
    natureOfSuit: raw.nature_of_suit || "Not recorded",
    dateFiled: raw.date_filed ?? "",
    dateTerminated: raw.date_terminated,
    dateLastFiling: raw.date_last_filing,
  };
}

export async function getDocket(id: number): Promise<DocketLookup> {
  const token = process.env.COURTLISTENER_API_TOKEN;

  if (!token) {
    // Mock path: seed data only.
    const docket = findDocket(id);
    return docket
      ? { ok: true, docket, source: "seed" }
      : {
          ok: false,
          status: 404,
          source: "seed",
          message: `Docket ${id} is not in the demo set. Add COURTLISTENER_API_TOKEN to .env.local to look up any federal docket.`,
        };
  }

  // Live path: CourtListener v4.
  try {
    const res = await fetch(
      `${API_BASE}/dockets/${id}/?fields=id,case_name,case_name_short,docket_number,court_id,nature_of_suit,date_filed,date_terminated,date_last_filing`,
      {
        headers: { Authorization: `Token ${token}`, Accept: "application/json" },
        next: { revalidate: 120 },
      }
    );
    if (res.status === 404) {
      return { ok: false, status: 404, source: "courtlistener", message: `CourtListener has no docket ${id}.` };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        source: "courtlistener",
        message: `CourtListener answered ${res.status}. Check the token and rate limit.`,
      };
    }
    const raw = (await res.json()) as CourtListenerDocket;
    return { ok: true, docket: toSnapshot(raw), source: "courtlistener" };
  } catch {
    return { ok: false, status: 502, source: "courtlistener", message: "Could not reach CourtListener. Try again in a moment." };
  }
}
