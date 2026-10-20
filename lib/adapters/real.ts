import { formatEther } from "viem";
import { CONTRACT_ADDRESS, MAX_ESCROWS_LISTED } from "@/lib/config";
import { getDocket as getCourtListenerDocket, hasLiveCourtListener } from "@/lib/courtlistener";
import { escrows as seedEscrows } from "@/lib/data/seed";
import { fail } from "@/lib/errors";
import { readBalanceEth, readEscrow, readEscrowCount, readEscrowEvents } from "@/lib/escrow-chain";
import { coreLog } from "@/lib/log";
import type { Escrow } from "@/lib/types";
import { seedDocketResult, seedEscrowResult } from "./fake";
import type { DecretaAdapter } from "./types";

// Real sources: CourtListener v4 for dockets, DecretaEscrow on Sepolia for escrows.
// Each method falls back to the seed (source "seed") while its setting is missing,
// so ADAPTER_MODE=real renders before the token is set or the contract is deployed.

export const realAdapter: DecretaAdapter = {
  async getDocket(id) {
    if (!hasLiveCourtListener()) {
      const seeded = seedDocketResult(id, "");
      if (seeded.ok) return seeded;
      return fail(
        "not_configured",
        "seed",
        `Docket ${id} is not in the demo set, and COURTLISTENER_API_TOKEN is not set on the server.`
      );
    }
    return getCourtListenerDocket(id);
  },

  async listEscrows() {
    if (!CONTRACT_ADDRESS) return { ok: true, data: seedEscrows, source: "seed" };

    const count = await readEscrowCount();
    if (!count.ok) return count;

    // The one loop over chain ids, capped at MAX_ESCROWS_LISTED. List rows carry
    // state-derived events; the record page loads the full log history.
    const ids = Array.from({ length: Math.min(count.data, MAX_ESCROWS_LISTED) }, (_, i) => i + 1);
    const reads = await Promise.all(ids.map((id) => readEscrow(id)));
    const failed = reads.find((r) => !r.ok);
    if (failed && !failed.ok) return failed;

    const data: Escrow[] = reads.flatMap((r) => (r.ok ? [r.data] : []));
    coreLog("escrows listed", { count: data.length });
    return { ok: true, data, source: "chain" };
  },

  async getEscrow(id) {
    if (!CONTRACT_ADDRESS) return seedEscrowResult(id);

    const started = Date.now();
    const read = await readEscrow(id);
    if (!read.ok) {
      coreLog("escrow read", { id, status: read.error, ms: Date.now() - started });
      return read;
    }

    const [history, payeeBalanceEth] = await Promise.all([
      readEscrowEvents(id, read.data),
      readBalanceEth(read.data.onMet.address),
    ]);
    const escrow: Escrow = {
      ...read.data,
      events: history.events,
      // getEscrow zeroes the amount once paid out; the Deposited log keeps it.
      amountEth: history.depositedWei !== null ? formatEther(history.depositedWei) : read.data.amountEth,
      payeeBalanceEth,
    };
    coreLog("escrow read", { id, status: escrow.status, ms: Date.now() - started });
    return { ok: true, data: escrow, source: "chain" };
  },
};
