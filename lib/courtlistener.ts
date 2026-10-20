import { COURTLISTENER_API_BASE, DOCKET_REVALIDATE_S, HTTP_TIMEOUT_MS, RETRY_COUNT } from "@/lib/config";
import { COURT_NAMES } from "@/lib/courts";
import { fail, type ErrorCode } from "@/lib/errors";
import { coreLog } from "@/lib/log";
import { courtListenerDocketSchema, type CourtListenerDocket } from "@/lib/schemas";
import { courtListenerToken } from "@/lib/secrets";
import type { ApiResult, DocketSnapshot } from "@/lib/types";

// CourtListener REST API v4 boundary (server only, the token never ships to the
// browser). One GET with a timeout, RETRY_COUNT retries on timeout or 5xx only,
// and a zod parse of the body. The seed fallback lives in lib/adapters/real.ts.
// The CRE workflow reads the same endpoint and the same two fields
// (date_terminated, date_last_filing) inside the DON.

const FIELDS =
  "id,case_name,case_name_short,docket_number,court_id,nature_of_suit,date_filed,date_terminated,date_last_filing";

export function hasLiveCourtListener(): boolean {
  return Boolean(courtListenerToken());
}

function toSnapshot(raw: CourtListenerDocket): DocketSnapshot {
  return {
    id: raw.id,
    caseName: raw.case_name || raw.case_name_short || `Docket ${raw.id}`,
    docketNumber: raw.docket_number || "unnumbered",
    courtId: raw.court_id,
    court: COURT_NAMES[raw.court_id] ?? raw.court_id.toUpperCase(),
    natureOfSuit: raw.nature_of_suit || "Not recorded",
    dateFiled: raw.date_filed ?? "",
    dateTerminated: raw.date_terminated ?? null,
    dateLastFiling: raw.date_last_filing ?? null,
  };
}

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function failed(id: number, code: ErrorCode, hint?: string): ApiResult<DocketSnapshot> {
  coreLog("docket failed", { id, code });
  return fail(code, "courtlistener", hint);
}

export async function getDocket(id: number): Promise<ApiResult<DocketSnapshot>> {
  const token = courtListenerToken();
  if (!token) return failed(id, "not_configured", "COURTLISTENER_API_TOKEN is not set on the server.");

  coreLog("docket requested", { id });
  const started = Date.now();
  let res: Response | null = null;
  let timedOut = false;

  // First attempt plus RETRY_COUNT retries, only after a timeout or a 5xx.
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      res = await fetch(`${COURTLISTENER_API_BASE}/dockets/${id}/?fields=${FIELDS}`, {
        headers: { Authorization: `Token ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
        next: { revalidate: DOCKET_REVALIDATE_S },
      });
      timedOut = false;
      if (res.status < 500) break;
    } catch (err) {
      res = null;
      timedOut = isTimeout(err);
      if (!timedOut) break;
    }
  }

  if (!res) return failed(id, timedOut ? "upstream_timeout" : "upstream_error");
  if (res.status === 404) return failed(id, "not_found", `CourtListener has no docket ${id}.`);
  if (!res.ok) return failed(id, "upstream_error", `CourtListener answered ${res.status}. Check the token and rate limit.`);

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return failed(id, "parse_failure");
  }
  const parsed = courtListenerDocketSchema.safeParse(body);
  if (!parsed.success) return failed(id, "parse_failure");

  coreLog("docket ok", { id, ms: Date.now() - started });
  return { ok: true, data: toSnapshot(parsed.data), source: "courtlistener" };
}
