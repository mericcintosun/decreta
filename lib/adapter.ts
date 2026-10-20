import { fakeAdapter } from "@/lib/adapters/fake";
import { realAdapter } from "@/lib/adapters/real";
import type { DecretaAdapter } from "@/lib/adapters/types";
import { hasLiveCourtListener } from "@/lib/courtlistener";

// The selector. The only file that reads ADAPTER_MODE:
//   fake (default): seed register only, never touches the network.
//   real: CourtListener v4 dockets and DecretaEscrow reads on Sepolia, each
//         with a seed fallback while its env var is unset.
// Pages and handlers import `adapter` from here and nothing under lib/adapters/.

export type { DecretaAdapter };

export const adapterMode: "real" | "fake" = process.env.ADAPTER_MODE === "real" ? "real" : "fake";

export const adapter: DecretaAdapter = adapterMode === "real" ? realAdapter : fakeAdapter;

/** True when docket lookups go to CourtListener live. */
export function hasLiveDockets(): boolean {
  return adapterMode === "real" && hasLiveCourtListener();
}
