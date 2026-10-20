// Domain types for Decreta. Relative imports only: scripts/seed.ts runs this under tsx.
//
// DocketSnapshot mirrors the fields we read from CourtListener's v4
// /api/rest/v4/dockets/{id}/ endpoint (case_name, docket_number, court_id,
// date_filed, date_terminated, date_last_filing).

import type { ErrorCode } from "./errors";

export type Hex = `0x${string}`;

export type ConditionKind = "terminated" | "filing-after";
export type EscrowStatus = "locked" | "released" | "refunded";
export type EventKind = "deposited" | "checked" | "released" | "refunded";

export type DocketSource = "courtlistener" | "seed";
export type DataSource = "seed" | "courtlistener" | "chain";

export interface DocketSnapshot {
  id: number;
  caseName: string;
  docketNumber: string;
  courtId: string;
  court: string;
  natureOfSuit: string;
  dateFiled: string;
  dateTerminated: string | null;
  dateLastFiling: string | null;
}

export interface Party {
  label: string;
  address: Hex;
}

export interface EscrowEvent {
  kind: EventKind;
  at: string;
  txHash: Hex;
  note: string;
}

export interface Escrow {
  id: number;
  docketId: number;
  condition: ConditionKind;
  /** Only for "filing-after": a filing dated after this day satisfies the condition. */
  filedAfter: string | null;
  /** After this day an unmet escrow can be refunded to onExpiry. */
  deadline: string;
  amountEth: string;
  memo: string;
  onMet: Party;
  onExpiry: Party;
  status: EscrowStatus;
  events: EscrowEvent[];
  /** True for escrows created in this browser while no contract is configured. */
  local?: boolean;
  /** Docket as seen at creation time, cached for escrows outside the seed set. */
  docketSnapshot?: DocketSnapshot;
  /** onMet's Sepolia balance at read time (real adapter only); null when the RPC did not answer. */
  payeeBalanceEth?: string | null;
}

/** The failure branch: a typed code for the UI, a plain sentence for people. */
export type ApiFailure = { ok: false; error: ErrorCode; hint: string; status: number; source: DataSource };

/** The one response shape for every API route and adapter call. */
export type ApiResult<T> = { ok: true; data: T; source: DataSource } | ApiFailure;
