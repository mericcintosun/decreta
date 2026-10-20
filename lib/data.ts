// Barrel for Decreta's domain layer. Types live in lib/types.ts, the seed
// register in lib/data/seed.ts. This file keeps the helpers and re-exports
// both so every existing `@/lib/data` import keeps resolving.

import { dockets, escrows } from "./data/seed";
import type { DocketSnapshot, Escrow, EscrowStatus } from "./types";

export * from "./types";
export * from "./data/seed";

export function findDocket(id: number): DocketSnapshot | undefined {
  return dockets.find((d) => d.id === id);
}

export function findEscrow(id: number): Escrow | undefined {
  return escrows.find((e) => e.id === id);
}

/** Accepts a CourtListener docket URL or a bare numeric id. */
export function parseDocketInput(input: string): number | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/docket\/(\d+)/);
  const raw = fromUrl ? fromUrl[1] : /^\d+$/.test(trimmed) ? trimmed : null;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function courtListenerUrl(id: number): string {
  return `https://www.courtlistener.com/docket/${id}/`;
}

/**
 * The release rule. The CRE workflow (cre/decreta-docket/main.ts) and the
 * contract apply the same rule; keep the three in sync.
 */
export function evaluateCondition(
  escrow: Pick<Escrow, "condition" | "filedAfter">,
  docket: DocketSnapshot
): { met: boolean; reason: string } {
  if (escrow.condition === "terminated") {
    return docket.dateTerminated
      ? { met: true, reason: `Docket terminated on ${docket.dateTerminated}.` }
      : { met: false, reason: `Case still open. Last filing ${docket.dateLastFiling ?? "not recorded"}.` };
  }
  const after = escrow.filedAfter ?? "";
  if (docket.dateLastFiling && docket.dateLastFiling > after) {
    return { met: true, reason: `New filing on ${docket.dateLastFiling}, after ${after}.` };
  }
  return { met: false, reason: `No filing after ${after} yet. Last filing ${docket.dateLastFiling ?? "not recorded"}.` };
}

export function conditionSentence(escrow: Pick<Escrow, "condition" | "filedAfter">): string {
  return escrow.condition === "terminated"
    ? "Releases when the court terminates the case"
    : `Releases when a new filing lands after ${escrow.filedAfter}`;
}

export function shortHex(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

// Escrows created in this browser while no contract is configured (mock path).
const LOCAL_KEY = "decreta:local-escrows";

export function loadLocalEscrows(): Escrow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Escrow[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEscrow(escrow: Escrow): void {
  if (typeof window === "undefined") return;
  try {
    const rest = loadLocalEscrows().filter((e) => e.id !== escrow.id);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify([escrow, ...rest]));
  } catch {
    // Storage blocked (private mode): the escrow lives for this page view only.
  }
}

export function totals(list: Escrow[]) {
  const sum = (s: EscrowStatus | "all") =>
    list.filter((e) => s === "all" || e.status === s).reduce((acc, e) => acc + Number(e.amountEth), 0);
  return {
    count: list.length,
    released: list.filter((e) => e.status === "released").length,
    locked: list.filter((e) => e.status === "locked").length,
    refunded: list.filter((e) => e.status === "refunded").length,
    totalEth: sum("all").toFixed(2),
    releasedEth: sum("released").toFixed(2),
    lockedEth: sum("locked").toFixed(2),
  };
}
