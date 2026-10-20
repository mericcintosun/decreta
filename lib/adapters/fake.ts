import { dockets, escrows } from "@/lib/data/seed";
import { fail } from "@/lib/errors";
import type { ApiResult, DocketSnapshot, Escrow } from "@/lib/types";
import type { DecretaAdapter } from "./types";

// Seed register only. Never touches the network.

export function seedDocketResult(id: number, notFoundHint: string): ApiResult<DocketSnapshot> {
  const docket = dockets.find((d) => d.id === id);
  return docket ? { ok: true, data: docket, source: "seed" } : fail("not_found", "seed", notFoundHint);
}

export function seedEscrowResult(id: number): ApiResult<Escrow> {
  const escrow = escrows.find((e) => e.id === id);
  return escrow
    ? { ok: true, data: escrow, source: "seed" }
    : fail("not_found", "seed", `Escrow ${id} is not in the demo register.`);
}

export const fakeAdapter: DecretaAdapter = {
  async getDocket(id) {
    return seedDocketResult(
      id,
      `Docket ${id} is not in the demo set. Set ADAPTER_MODE=real and COURTLISTENER_API_TOKEN to look up any federal docket.`
    );
  },
  async listEscrows() {
    return { ok: true, data: escrows, source: "seed" };
  },
  async getEscrow(id) {
    return seedEscrowResult(id);
  },
};
