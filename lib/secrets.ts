// Server only, never import from a `use client` file.
// The one module that reads secret env vars. Callers get values, never log them.

export function courtListenerToken(): string {
  return process.env.COURTLISTENER_API_TOKEN ?? "";
}

/** Sepolia RPC endpoint with its key. Empty means viem's public default RPC. */
export function sepoliaRpcUrl(): string {
  return process.env.SEPOLIA_RPC_URL ?? "";
}

/** Block of the Deploy.s.sol transaction, where event scans start. */
export function escrowDeployBlock(): bigint | null {
  const raw = (process.env.ESCROW_DEPLOY_BLOCK ?? "").trim();
  return /^\d+$/.test(raw) ? BigInt(raw) : null;
}
