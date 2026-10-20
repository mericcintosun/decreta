import { BaseError, UserRejectedRequestError } from "viem";
import type { Hex } from "./types";

// The browser wallet as one named state. components/wallet-panel.tsx renders
// one branch per status; the lock button reads `status` to guard double sends.
//
//   disconnected ──connect()──> connecting ──> idle | wrong-network
//   wrong-network ──switchNetwork()──> idle
//   idle ──lock──> tx-pending ──receipt confirmed by /api/escrows/confirm──> tx-confirmed
//                            ├──wallet closed──> tx-rejected
//                            └──revert, RPC or confirm failure──> tx-failed

export type WalletState =
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "wrong-network"; account: Hex; chainId: number }
  | { status: "idle"; account: Hex; simulated: boolean }
  /** txHash is null while the wallet still waits for a signature. */
  | { status: "tx-pending"; account: Hex; txHash: Hex | null }
  | { status: "tx-confirmed"; account: Hex; txHash: Hex; escrowId: number }
  | { status: "tx-rejected"; account: Hex }
  | { status: "tx-failed"; account: Hex; message: string };

export type WalletStatus = WalletState["status"];

/** States from which a new lock may start. */
export function canSend(state: WalletState): state is Extract<WalletState, { account: Hex }> {
  return (
    state.status === "idle" ||
    state.status === "tx-confirmed" ||
    state.status === "tx-rejected" ||
    state.status === "tx-failed"
  );
}

function hasRejectCode(value: unknown): boolean {
  let current: unknown = value;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    if ((current as { code?: unknown }).code === 4001) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** The user closing the wallet is not a failure; everything else is. */
export function classifyTxError(err: unknown): "tx-rejected" | "tx-failed" {
  if (err instanceof UserRejectedRequestError) return "tx-rejected";
  if (err instanceof BaseError && err.walk((e) => e instanceof UserRejectedRequestError)) return "tx-rejected";
  if (hasRejectCode(err)) return "tx-rejected";
  return "tx-failed";
}

/** One plain sentence for tx-failed, without the stack viem appends. */
export function txErrorMessage(err: unknown): string {
  if (err instanceof BaseError) return err.shortMessage.replace(/\.$/, "");
  if (err instanceof Error) return err.message.replace(/\.$/, "");
  return "unknown error";
}
