import { isAddress, type Address } from "viem";

// Client-safe configuration: public NEXT_PUBLIC_* keys and constants only.
// Secret env vars live in lib/secrets.ts, which is server only.

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

/** DecretaEscrow on Sepolia, or null to keep the mock lock and seed reads. */
export const CONTRACT_ADDRESS: Address | null = isAddress(rawAddress) ? rawAddress : null;

const rawPlaintiff = process.env.NEXT_PUBLIC_DEMO_PLAINTIFF ?? "";

/** Prefill for "Pays to when met" on the live path. A public address, never a key. */
export const DEMO_PLAINTIFF: Address | null = isAddress(rawPlaintiff) ? rawPlaintiff : null;

/** Chain the frontend targets. Ethereum Sepolia is 11155111. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);

export const COURTLISTENER_API_BASE = "https://www.courtlistener.com/api/rest/v4";
export const EXPLORER_BASE = "https://sepolia.etherscan.io";

export const HTTP_TIMEOUT_MS = 8000;
export const RPC_TIMEOUT_MS = 10000;
/** Retries after the first attempt, only on timeout or 5xx. */
export const RETRY_COUNT = 1;
export const MAX_ESCROWS_LISTED = 50;
export const DOCKET_REVALIDATE_S = 120;
/** Record page poll while an escrow is locked on the live path. */
export const LIVE_POLL_MS = 5000;
/** getLogs window; many free RPC tiers cap eth_getLogs at 10,000 blocks. */
export const LOG_WINDOW_BLOCKS = 9000;
