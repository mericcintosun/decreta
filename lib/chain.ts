import { createWalletClient, custom, parseEther, type Address, type EIP1193Provider } from "viem";
import { sepolia } from "viem/chains";
import { CHAIN_ID, CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/config";
import { mockTxHash, type ApiResult, type ConditionKind, type Hex } from "@/lib/data";
import { escrowAbi } from "@/lib/escrow-abi";

// DecretaEscrow writes from the browser. Same function, two paths:
//   1. NEXT_PUBLIC_CONTRACT_ADDRESS set: sendLock signs createEscrow in the
//      browser wallet, then /api/escrows/confirm reads the receipt on the server.
//   2. not set: a mock receipt so the UI flow works with zero setup.
// Server-side reads with the keyed RPC live in lib/escrow-chain.ts.

export { escrowAbi };
export const contractAddress: Address | null = CONTRACT_ADDRESS;
export const chainId = CHAIN_ID;
export const isLiveChain = contractAddress !== null && chainId === sepolia.id;

/** How often and how long the client asks the server whether the lock is mined. */
const CONFIRM_POLL_MS = 3000;
const CONFIRM_ATTEMPTS = 40;

export function explorerTx(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function toUnixDay(isoDate: string): bigint {
  return BigInt(Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 1000));
}

export interface LockInput {
  docketId: number;
  condition: ConditionKind;
  filedAfter: string | null;
  deadline: string;
  amountEth: string;
  onMet: Hex;
  onExpiry: Hex;
}

export interface LockReceipt {
  mode: "chain" | "mock";
  escrowId: number;
  txHash: Hex;
}

export function injectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum ?? null;
}

/** Signs createEscrow in the connected wallet and returns the hash. Does not wait for mining. */
export async function sendLock(input: LockInput): Promise<Hex> {
  if (!contractAddress) throw new Error("No contract address is set");
  const provider = injectedProvider();
  if (!provider) throw new Error("No browser wallet found. Install a wallet and switch it to Sepolia");

  const wallet = createWalletClient({ chain: sepolia, transport: custom(provider) });
  const [account] = await wallet.getAddresses();
  if (!account) throw new Error("The wallet is not connected");

  return wallet.writeContract({
    account,
    address: contractAddress,
    abi: escrowAbi,
    functionName: "createEscrow",
    args: [
      BigInt(input.docketId),
      input.condition === "terminated" ? 0 : 1,
      input.filedAfter ? toUnixDay(input.filedAfter) : BigInt(0),
      toUnixDay(input.deadline),
      input.onMet,
      input.onExpiry,
    ],
    value: parseEther(input.amountEth),
  });
}

/** Asks the server for the Deposited id of a sent lock until the receipt is mined. */
async function confirmLock(txHash: Hex): Promise<number> {
  for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
    const res = await fetch("/api/escrows/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ txHash }),
      cache: "no-store",
    });
    const body = (await res.json()) as ApiResult<{ escrowId: number; txHash: Hex }>;
    if (body.ok) return body.data.escrowId;
    if (body.error !== "not_found") throw new Error(body.hint);
    await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS));
  }
  throw new Error("The transaction was sent but is not mined after two minutes. Check it on Etherscan");
}

export async function lockFunds(
  input: LockInput,
  nextMockId: number,
  hooks: { onSent?: (txHash: Hex) => void } = {}
): Promise<LockReceipt> {
  if (!isLiveChain) {
    // Mock path (DEMO step 3 fallback): no contract configured. Pretend the tx confirmed.
    const txHash = mockTxHash(`lock-${nextMockId}-${Date.now()}`);
    hooks.onSent?.(txHash);
    await new Promise((r) => setTimeout(r, 900));
    return { mode: "mock", escrowId: nextMockId, txHash };
  }

  const txHash = await sendLock(input);
  hooks.onSent?.(txHash);
  const escrowId = await confirmLock(txHash);
  return { mode: "chain", escrowId, txHash };
}
