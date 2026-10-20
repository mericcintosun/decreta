import type { ApiResult, DocketSnapshot, Escrow } from "@/lib/types";

/** The one data seam for pages and API routes. lib/adapter.ts picks the implementation. */
export interface DecretaAdapter {
  getDocket(id: number): Promise<ApiResult<DocketSnapshot>>;
  listEscrows(): Promise<ApiResult<Escrow[]>>;
  getEscrow(id: number): Promise<ApiResult<Escrow>>;
}
