// Demo reset (run with `npm run demo:reset`, after scripts/seed.ts).
//
// The chain is never rolled back. Released escrows stay released; each demo
// cycle uses the next fresh escrow id, and this script points the CRE watch list
// at it. In order:
//   1. read escrowCount
//   2. make sure a LOCKED escrow on the open docket 69102877 exists (DEMO step 7)
//   3. top up DEMO_WALLET_ADDRESS to 0.05 ETH when it holds less than 0.03
//   4. rewrite cre/decreta-docket/config.staging.json: escrowAddress and watch
//   5. print the id the presenter's next lock will get
//
// Reads RPC_URL, PRIVATE_KEY, DEPLOYED_CONTRACT and optional DEMO_WALLET_ADDRESS
// from the shell, falling back to .env.local. Testnet keys only.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { escrowAbi } from "../lib/escrow-abi";

const CLOSED_DOCKET = 68519034;
const OPEN_DOCKET = 69102877;
const OPEN_LOCK_ETH = "0.0001";
const TOP_UP_BELOW_ETH = "0.03";
const TOP_UP_TO_ETH = "0.05";
const STATUS_LOCKED = 1;
const CONFIG_PATH = resolve(process.cwd(), "cre/decreta-docket/config.staging.json");

function loadEnvLocal(): void {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined && process.env[key] !== "") continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}

function required(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    console.error(`demo-reset: ${name} is not set (shell or .env.local).`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const rpcUrl = required("RPC_URL");
  const rawKey = required("PRIVATE_KEY");
  const contract = required("DEPLOYED_CONTRACT");
  if (!isAddress(contract)) throw new Error("DEPLOYED_CONTRACT is not a 0x address.");
  const demoWallet = (process.env.DEMO_WALLET_ADDRESS ?? "").trim();

  const account = privateKeyToAccount((rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex);
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const address = contract as Address;

  // 1. escrowCount
  let count = Number(await publicClient.readContract({ address, abi: escrowAbi, functionName: "escrowCount" }));
  console.log(`demo-reset: contract ${address} holds ${count} escrows.`);

  // 2. The open-docket escrow that must stay LOCKED on camera.
  let openId: number | null = null;
  for (let id = 1; id <= count; id++) {
    const e = await publicClient.readContract({ address, abi: escrowAbi, functionName: "getEscrow", args: [BigInt(id)] });
    if (Number(e.docketId) === OPEN_DOCKET && e.status === STATUS_LOCKED) {
      openId = id;
      break;
    }
  }

  if (openId === null) {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60);
    console.log(`demo-reset: no locked escrow on docket ${OPEN_DOCKET}, locking ${OPEN_LOCK_ETH} ETH on it.`);
    const hash = await wallet.writeContract({
      address,
      abi: escrowAbi,
      functionName: "createEscrow",
      args: [BigInt(OPEN_DOCKET), 0, BigInt(0), deadline, account.address, account.address],
      value: parseEther(OPEN_LOCK_ETH),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const [deposited] = parseEventLogs({ abi: escrowAbi, logs: receipt.logs, eventName: "Deposited" });
    if (receipt.status !== "success" || !deposited) throw new Error(`Open-docket lock ${hash} did not emit Deposited.`);
    openId = Number(deposited.args.id);
    count = Number(await publicClient.readContract({ address, abi: escrowAbi, functionName: "escrowCount" }));
    console.log(`demo-reset: escrow ${openId} locked on docket ${OPEN_DOCKET}, tx ${hash}`);
  } else {
    console.log(`demo-reset: escrow ${openId} on docket ${OPEN_DOCKET} is already locked.`);
  }
  if (openId !== 2) {
    console.warn(`demo-reset: the open-docket escrow is No. ${openId}, not 2. Open /escrows/${openId} in DEMO step 7.`);
  }

  // 3. Demo wallet top-up.
  if (demoWallet) {
    if (!isAddress(demoWallet)) throw new Error("DEMO_WALLET_ADDRESS is not a 0x address.");
    const balance = await publicClient.getBalance({ address: demoWallet });
    if (balance < parseEther(TOP_UP_BELOW_ETH)) {
      const value = parseEther(TOP_UP_TO_ETH) - balance;
      const hash = await wallet.sendTransaction({ to: demoWallet, value });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`demo-reset: topped up ${demoWallet} by ${formatEther(value)} ETH, tx ${hash}`);
    } else {
      console.log(`demo-reset: demo wallet holds ${formatEther(balance)} ETH, no top-up needed.`);
    }
  } else {
    console.log("demo-reset: DEMO_WALLET_ADDRESS not set, skipping the top-up.");
  }

  // 4. CRE watch list: the escrow the presenter locks next, and the open docket.
  const nextId = count + 1;
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Record<string, unknown>;
  config.escrowAddress = address;
  config.watch = [
    { escrowId: nextId, docketId: CLOSED_DOCKET, condition: "terminated", filedAfter: null },
    { escrowId: openId, docketId: OPEN_DOCKET, condition: "terminated", filedAfter: null },
  ];
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`demo-reset: wrote ${CONFIG_PATH}`);

  // 5. The id to expect on the confirmation card.
  console.log(`demo-reset: next demo escrow is No. ${nextId}. Lock it on docket ${CLOSED_DOCKET} from /escrows, then run the CRE simulate.`);
}

main().catch((err: unknown) => {
  console.error(`demo-reset: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
