"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { isLiveChain } from "@/lib/chain";
import { LIVE_POLL_MS } from "@/lib/config";
import { loadLocalEscrows, type ApiResult, type Escrow } from "@/lib/data";

// The one data hook of the record page (DEMO steps 4 to 7).
//   Live branch: while the escrow is locked on Sepolia, poll GET /api/escrows/[id]
//   every LIVE_POLL_MS and take the server copy whole, so the timeline holds the
//   real Checked and Released rows with their tx hashes.
//   Local branch (fake path fallback): an escrow created in this browser is read
//   once from localStorage.

export interface EscrowLive {
  escrow: Escrow | null;
  setEscrow: Dispatch<SetStateAction<Escrow | null>>;
  /** False until the local branch has looked in this browser. */
  resolved: boolean;
  /** Payee balance first seen while the escrow was still locked. */
  balanceBefore: string | null;
}

function lockedBalance(escrow: Escrow | null): string | null {
  return escrow?.status === "locked" ? (escrow.payeeBalanceEth ?? null) : null;
}

export function useEscrowLive(escrowId: number, seed: Escrow | null): EscrowLive {
  const [escrow, setEscrow] = useState<Escrow | null>(seed);
  const [resolved, setResolved] = useState(seed !== null);
  const [balanceBefore, setBalanceBefore] = useState<string | null>(() => lockedBalance(seed));
  const inFlight = useRef(false);

  // Local branch: escrows from the mock lock live in this browser only.
  useEffect(() => {
    if (seed) return;
    const local = loadLocalEscrows().find((e) => e.id === escrowId) ?? null;
    setEscrow(local);
    setResolved(true);
  }, [seed, escrowId]);

  // Live branch: poll the server copy until the CRE report moves the funds.
  const shouldPoll = isLiveChain && escrow !== null && !escrow.local && escrow.status === "locked";
  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    const timer = setInterval(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch(`/api/escrows/${escrowId}`, { cache: "no-store" });
        const body = (await res.json()) as ApiResult<Escrow>;
        if (!active || !body.ok || body.source !== "chain") return;
        setEscrow(body.data);
        setBalanceBefore((prev) => prev ?? lockedBalance(body.data));
      } catch {
        // A missed poll is retried on the next tick.
      } finally {
        inFlight.current = false;
      }
    }, LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [shouldPoll, escrowId]);

  return { escrow, setEscrow, resolved, balanceBefore };
}
