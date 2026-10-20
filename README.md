# Decreta

Decreta is settlement escrow bound to a US federal court docket: the parties lock funds on-chain against a CourtListener docket, a Chainlink CRE workflow reads that docket on a schedule, and the money goes to the payee by itself once the court closes the case or files the agreed order, with a refund to the depositor if the deadline passes first.

> Live demo: https://decreta.vercel.app
> Video: <ADD_VIDEO_URL>

## The problem

Two parties settle a federal case. The agreement says the balance is paid once the court dismisses the case. Until then the money sits in a lawyer's trust account, and getting it out depends on a person: someone has to notice the dismissal on PACER, confirm it, and send the wire instruction. That takes days. It is easy to get wrong. And if the other side does not trust the lawyer holding the money, both sides pay an escrow company on top.

Crypto escrow has not solved this for people who are already in court. Kleros moves the dispute to its own jury, which is a second court nobody asked for. Signature-based escrow needs both parties to cooperate at exactly the moment they trust each other least. What the parties actually want is simple: let the court they are already in be the trigger.

## The solution

Decreta binds an escrow to a CourtListener docket id and one docket event:

- **Case terminated**: the docket gets a `date_terminated`.
- **New filing after a date**: `date_last_filing` moves past a chosen day (useful for a fee that is due once an approval order is filed).

The depositor pastes a CourtListener docket link, sees the real case name, court and status, picks the event, a payee, a refund address and a deadline, and locks the funds in `DecretaEscrow` on Sepolia. A Chainlink CRE workflow reads the docket every ten minutes. When the DON agrees the event happened, it writes a signed report to the contract and the money moves in the same transaction. Nobody signs a release. If the deadline passes first, anyone can trigger the refund.

Every step lands as an event on-chain (`Deposited`, `Checked`, `Released`, `Refunded`), and the escrow record page shows them as a timeline next to the docket as it stands today.

## How it uses Chainlink CRE

The CRE workflow in `cre/decreta-docket/main.ts` is the only path by which an escrow can pay its payee. Remove it and the contract never learns what the court did.

1. **Cron Trigger** fires every 10 minutes (`config.staging.json`).
2. **HTTP capability in node mode**: every DON node calls `GET /api/rest/v4/dockets/{id}/` on CourtListener with the API token pulled from CRE secrets. Moving this call to Confidential HTTP, so the token is only decrypted inside the enclave, is the next task on the list.
3. **Consensus**: `ConsensusAggregationByFields` takes the median of `date_terminated` and `date_last_filing` (as day numbers) across nodes, so one faulty or lying node cannot invent a dismissal.
4. **EVM Write**: when the condition is met, the workflow signs `abi.encode(escrowId, true, observedAt)` and delivers it through the CRE forwarder to `DecretaEscrow.onReport`. The contract rejects any other caller with `NotForwarder`.

The same release rule lives in three places that must stay in sync: `evaluateCondition` in `lib/data.ts`, the `met` check in the workflow, and the contract.

## Trust model and limits

- The data source is CourtListener, the Free Law Project's mirror of PACER that RECAP users and bulk imports keep current. A stale docket means the escrow waits. A missing date always reads as "not yet", so it never pays early on missing data.
- A terminated case is not a judgment in your favor. Decreta binds money to a docket event, so the condition has to match what the settlement agreement says.
- There is no challenge window yet. A 72-hour timelock during which either side can dispute a release is the next contract change.
- Sepolia testnet only. This is not legal advice.

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn-style primitives
- viem for Sepolia reads and writes from the browser wallet
- Solidity 0.8.20 and Foundry (`contracts/`)
- Chainlink CRE TypeScript SDK under Bun (`cre/decreta-docket/`), `cre workflow simulate --broadcast`
- CourtListener REST API v4 (`/dockets/`)
- Ethereum Sepolia (chain id 11155111)

## Quickstart

```bash
npm install
cp .env.example .env.local   # every variable is optional
npm run dev                  # http://localhost:3000
```

With no env vars the escrow desk runs on a register of 9 escrows across 10 dockets, and locking is simulated in the browser. Set `COURTLISTENER_API_TOKEN` to look up any federal docket live, and `NEXT_PUBLIC_CONTRACT_ADDRESS` to lock real Sepolia ETH.

Contracts (see `contracts/README.md`):

```bash
cd contracts
forge build && forge test
PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

CRE workflow (needs the `cre` CLI and Bun 1.2.21+):

```bash
cd cre/decreta-docket
bun install
cre secrets set COURTLISTENER_API_TOKEN   # or put it in the project's secrets.yaml
cre workflow simulate decreta-docket --target staging-settings --broadcast
```

## Architecture

```
 browser (Next.js)                       Sepolia
 ┌──────────────────────┐   createEscrow  ┌──────────────────┐
 │ /escrows  lock form   │ ──────────────> │  DecretaEscrow   │ ── Released ──> payee
 │ /escrows/[id] record  │ <── getEscrow ─ │  onReport()      │
 └─────────┬────────────┘                  └────────▲─────────┘
           │ /api/docket/[id]                       │ signed report (EVM Write)
           ▼                                        │
   CourtListener v4  <──── HTTP, every node ──── CRE workflow (Cron, DON consensus)
```

## What we would build next

1. Confidential HTTP for the CourtListener call, so the API token never leaves the enclave.
2. A 72-hour challenge window before release, with a dispute that freezes funds and notifies both counsel.
3. ERC-20 support, starting with USDC, since real settlements are not paid in ETH.
4. Watch any escrow automatically: the workflow reads `Deposited` events instead of a static watch list.
5. More docket events: a specific order type in the docket entries, once that endpoint's access is confirmed.

## AI use

> We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.

(Adjust this section to the hackathon's disclosure rules before submitting.)
