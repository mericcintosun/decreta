import { getDocket as getCourtListenerDocket } from "@/lib/courtlistener";
import { dockets, escrows } from "@/lib/data/seed";
import type { ApiResult, DocketSnapshot, Escrow } from "@/lib/types";

// The one data seam for pages and API routes. ADAPTER_MODE picks the path:
//   fake (default): seed register only, never touches the network.
//   real: dockets come from CourtListener v4 (seed fallback when no token is set).
// Pages and handlers import `adapter`; Phase 2 swaps sources here, not in pages.

export interface DecretaAdapter {
  getDocket(id: number): Promise<ApiResult<DocketSnapshot>>;
  listEscrows(): Promise<ApiResult<Escrow[]>>;
  getEscrow(id: number): Promise<ApiResult<Escrow>>;
}

function seedEscrow(id: number): ApiResult<Escrow> {
  const escrow = escrows.find((e) => e.id === id);
  return escrow
    ? { ok: true, data: escrow, source: "seed" }
    : {
        ok: false,
        status: 404,
        source: "seed",
        error: { code: "not_found", message: `Escrow ${id} is not in the demo register.` },
      };
}

export const fakeAdapter: DecretaAdapter = {
  async getDocket(id) {
    const docket = dockets.find((d) => d.id === id);
    return docket
      ? { ok: true, data: docket, source: "seed" }
      : {
          ok: false,
          status: 404,
          source: "seed",
          error: {
            code: "not_found",
            message: `Docket ${id} is not in the demo set. Set ADAPTER_MODE=real and COURTLISTENER_API_TOKEN to look up any federal docket.`,
          },
        };
  },
  async listEscrows() {
    return { ok: true, data: escrows, source: "seed" };
  },
  async getEscrow(id) {
    return seedEscrow(id);
  },
};

export const realAdapter: DecretaAdapter = {
  async getDocket(id) {
    const lookup = await getCourtListenerDocket(id);
    return lookup.ok
      ? { ok: true, data: lookup.docket, source: lookup.source }
      : {
          ok: false,
          status: lookup.status,
          source: lookup.source,
          error: { code: lookup.status === 404 ? "not_found" : "upstream_error", message: lookup.message },
        };
  },
  // Phase 2: read DecretaEscrow on Sepolia
  async listEscrows() {
    return { ok: true, data: escrows, source: "seed" };
  },
  // Phase 2: read DecretaEscrow on Sepolia
  async getEscrow(id) {
    return seedEscrow(id);
  },
};

export const adapterMode: "real" | "fake" = process.env.ADAPTER_MODE === "real" ? "real" : "fake";

export const adapter: DecretaAdapter = adapterMode === "real" ? realAdapter : fakeAdapter;
