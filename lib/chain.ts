import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
  parseEther,
  parseEventLogs,
  type Address,
  type EIP1193Provider,
} from "viem";
import { sepolia } from "viem/chains";
import { mockTxHash, type ConditionKind, type EscrowStatus, type Hex } from "@/lib/data";

// DecretaEscrow adapter. Same functions, two paths:
//   1. NEXT_PUBLIC_CONTRACT_ADDRESS set: real Sepolia calls through viem
//      (wallet via window.ethereum, reads via the public RPC).
//   2. not set: mock receipts so the UI flow works with zero setup.

const rawAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
export const contractAddress: Address | null = isAddress(rawAddress) ? rawAddress : null;
export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? sepolia.id);
export const isLiveChain = contractAddress !== null && chainId === sepolia.id;

export const escrowAbi = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "payable",
    inputs: [
      { name: "docketId", type: "uint64" },
      { name: "condition", type: "uint8" },
      { name: "filedAfter", type: "uint64" },
      { name: "deadline", type: "uint64" },
      { name: "onMet", type: "address" },
      { name: "onExpiry", type: "address" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "docketId", type: "uint64" },
          { name: "condition", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "filedAfter", type: "uint64" },
          { name: "deadline", type: "uint64" },
          { name: "depositor", type: "address" },
          { name: "onMet", type: "address" },
          { name: "onExpiry", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "docketId", type: "uint64", indexed: true },
      { name: "depositor", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "condition", type: "uint8", indexed: false },
    ],
  },
] as const;

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

export function explorerTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
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

function injectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum ?? null;
}

export async function lockFunds(input: LockInput, nextMockId: number): Promise<LockReceipt> {
  if (!isLiveChain || !contractAddress) {
    // Mock path: no contract configured. Pretend the tx confirmed.
    await new Promise((r) => setTimeout(r, 900));
    return { mode: "mock", escrowId: nextMockId, txHash: mockTxHash(`lock-${nextMockId}-${Date.now()}`) };
  }

  const provider = injectedProvider();
  if (!provider) throw new Error("No browser wallet found. Install a wallet and switch it to Sepolia.");

  const wallet = createWalletClient({ chain: sepolia, transport: custom(provider) });
  const [account] = await wallet.requestAddresses();
  try {
    await wallet.switchChain({ id: sepolia.id });
  } catch {
    // Some wallets refuse programmatic switching; writeContract checks the chain anyway.
  }

  const txHash = await wallet.writeContract({
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

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const [deposited] = parseEventLogs({ abi: escrowAbi, logs: receipt.logs, eventName: "Deposited" });
  if (!deposited) throw new Error("Transaction confirmed but no Deposited event was found.");
  return { mode: "chain", escrowId: Number(deposited.args.id), txHash };
}

const STATUS_CODES: Record<number, EscrowStatus> = { 1: "locked", 2: "released", 3: "refunded" };

/** Reads the on-chain status. Returns null on the mock path or for unknown ids. */
export async function readEscrowStatus(id: number): Promise<EscrowStatus | null> {
  if (!isLiveChain || !contractAddress) return null;
  try {
    const escrow = await publicClient.readContract({
      address: contractAddress,
      abi: escrowAbi,
      functionName: "getEscrow",
      args: [BigInt(id)],
    });
    return STATUS_CODES[escrow.status] ?? null;
  } catch {
    return null;
  }
}
