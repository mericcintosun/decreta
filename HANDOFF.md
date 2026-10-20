# HANDOFF: Decreta

You are picking up a working scaffold. Read this whole file, then start on Mission task 1. Keep `npm run build` green after every change.

# Phase 3: live demo path (2026-10-20)

## Goal

With `ADAPTER_MODE=real`, all 7 DEMO steps run on the real flow: the lock goes through a named wallet state machine and a receipt confirmed on the server, the record page gains real `Checked` and `Released` rows within one 5 s poll, the plaintiff balance rises on screen, and escrow 2 exists on chain and stays LOCKED. `ADAPTER_MODE=fake` stays the fallback for every step.

## Status

All four slices are written. Nothing was built, run or tested.

| DEMO step | Real path | Fallback (same file or branch) |
| --- | --- | --- |
| 1 desk | `app/escrows/page.tsx` reads `realAdapter.listEscrows` (chain), now `force-dynamic` | fake adapter via `lib/adapter.ts` |
| 2 docket | `app/api/docket/[id]/route.ts` and `lib/courtlistener.ts` | seed docket (no token) via `lib/adapters/real.ts` |
| 3 lock | `useWallet` (`lib/use-wallet.ts`), `sendLock` in `lib/chain.ts`, `POST /api/escrows/confirm` | `lockFunds` mock branch (`!isLiveChain`) in `lib/chain.ts`, simulated wallet `idle` |
| 4 record | `app/escrows/[id]/page.tsx` plus `useEscrowLive`, balance line from `payeeBalanceEth` | fake adapter, and the local branch in `lib/use-escrow-live.ts` |
| 5 Checked | poll of `GET /api/escrows/[id]` every 5 s, rows from `getLogs` | local branch plus `runCheck` mock in `components/escrow-record.tsx` |
| 6 Released | same poll, stamp and "now Y ETH" | same as step 5 |
| 7 escrow 2 | created by `scripts/demo-reset.ts` on docket 69102877 | seed escrow 2 |

Cuts: none. Chunked `getLogs` and the demo wallet top-up are both in.

## Decisions

- **Persistence row: "the step's proof IS the chain".** No `lib/store.ts`, no database. Server reads go through `lib/escrow-chain.ts`, client writes through `lib/chain.ts`. Fake-mode browser escrows stay in localStorage (`LOCAL_KEY` in `lib/data.ts`).
  - Rejected, KV (Vercel KV or Upstash): a new dependency and env keys, and a second copy of chain truth that can drift from it.
  - Rejected, Postgres: schema, migrations and a dependency for data the contract already stores and proves.
- **No rollback reset.** The chain cannot be rolled back and does not need to be. `demo:reset` makes sure an open-docket escrow is locked, tops up the demo wallet, and points the CRE watch list at `escrowCount + 1`, the id the presenter's next lock gets. Released escrows stay released, so stale state never changes what the audience sees.
- **No wagmi or RainbowKit.** `lib/use-wallet.ts` is plain viem over `window.ethereum` (`accountsChanged`, `chainChanged`, `switchChain`, `addChain` on 4902). No new dependency.
- **Lock orchestration.** `lockFunds(input, nextMockId, { onSent })` in `lib/chain.ts`: live, `sendLock` signs and returns the hash, then `confirmLock` POSTs it to `/api/escrows/confirm` every 3 s until the receipt is mined (`not_found` means "ask again", up to 40 tries). The panel shows `tx-confirmed` only after that route answers ok. `readEscrowStatus` is deleted.
- **`idempotentConfirm` and `confirmedByTxHash` are module-level, not exported,** because Next 15 route files may only export handlers and route config. The answer comes from the immutable receipt, so a cold instance without the Map still returns the same id.
- **Event scan cache.** `readEscrowEvents` scans in windows of `LOG_WINDOW_BLOCKS` (9,000) and keeps, per escrow id and server instance, the entries found and the next block to scan, cached only 3 blocks behind the head. A 5 s poll then reads only the new tail. Block timestamps are cached too.
- **Both demo pages are `force-dynamic`,** so the register and the first render of a record never come from a build-time or cached copy.
- **Wallet state carries `simulated: boolean` on `idle`,** and `txHash` on `tx-pending` is `Hex | null` (null while the wallet still waits for a signature).
- **The record's balance line** shows "Plaintiff wallet: X ETH" and, once released, ", now Y ETH". `balanceBefore` is stored only if it was seen while locked; a record opened after release shows the current balance only.
- **`RegisterErrorState` lives in `components/escrow-console.tsx`** (a client file), so the server page can render it with a `router.refresh()` retry without a new file.

## Failed attempts

None.

## Files changed

New:
- `lib/wallet-state.ts`, `lib/use-wallet.ts`, `lib/use-escrow-live.ts`
- `components/wallet-panel.tsx`, `components/state-triad.tsx`
- `app/api/escrows/confirm/route.ts`, `app/escrows/error.tsx`, `app/escrows/[id]/error.tsx`
- `scripts/demo-reset.ts`

Edited:
- `lib/chain.ts`, `lib/escrow-chain.ts`, `lib/config.ts`, `lib/schemas.ts`, `lib/types.ts`, `lib/adapters/real.ts`
- `components/escrow-console.tsx`, `components/escrow-record.tsx`
- `app/escrows/page.tsx`, `app/escrows/[id]/page.tsx`, both `loading.tsx` files
- `package.json` (three scripts), `.env.example`, `README.md`, `DEMO.md`, `HANDOFF.md`, `.farm-commits.json`

Unchanged: `contracts/src/`, `contracts/script/Smoke.s.sol`, `cre/decreta-docket/main.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `IDENTITY.md`. `config.staging.json` is rewritten by `demo:reset` at run time, not by hand.

## Commands run

None that build, test or send. One read-only shell `cat tsconfig.json` ran by mistake (the phase allowed no shell); it changed nothing.

## Open questions

- **Forwarder trust gap is still open.** The MockKeystoneForwarder accepts any simulated report, so anyone can release a locked escrow by simulating against this contract. The fix (production KeystoneForwarder plus a workflow owner and id check in `onReport`) is a `DecretaEscrow.sol` change. Asking, not doing.
- **`app/page.tsx` still needs escrow 2 or a guard.** It calls `unwrap(adapter.getEscrow(2))`, which throws to `app/error.tsx` in real mode until `demo:reset` has locked the open-docket escrow. On a fresh contract that is id 2 only if Smoke ran first (id 1). `demo-reset` warns when the open-docket id is not 2. The file is on the never-touch list for this phase.
- **Watch list race.** The watch list names `escrowCount + 1`. If anyone else locks on the contract between `demo:reset` and the presenter's lock, the ids shift. Rerun `demo:reset` right before each cycle.
- **Reorg.** The scan cache treats blocks 3 deep as final. Sepolia reorgs deeper than that are rare; a cold start rescans.
- **`npm run contracts:*` read `$RPC_URL` from the shell.** npm does not load `.env.local`; export the vars first. `demo-reset.ts` does read `.env.local` itself.
- **"At most one hook" on the desk.** The console uses `useWallet` plus the pre-existing localStorage `useEffect` and one prefill `useEffect`. The record route meets the rule (`useEscrowLive` only, 0 `useEffect` in `components/escrow-record.tsx`).
- **Unverified until the runner runs commands:**
  - The TypeScript build. Likely friction: `provider.on`/`removeListener` typing on viem's `EIP1193Provider`, `Awaited<ReturnType<typeof publicClient.getTransactionReceipt>>`, the `getLogs({ strict: true, toBlock })` arg typing, and `scripts/demo-reset.ts` being type-checked by `next build` (tsconfig includes `**/*.ts`).
  - `npm run demo:reset`, the 5 s poll timing and three identical cycles.

## Next best step

Phase 4: landing and OG polish, including a guard or copy fix for `app/page.tsx` (escrow 2, stale "moved to the plaintiff" line), then the video.

## Env keys the runner must fill (additions)

| Key | Read by | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_DEMO_PLAINTIFF` | `lib/config.ts` (client prefill of "Pays to when met") | public address of the plaintiff wallet that receives the release |
| `DEMO_WALLET_ADDRESS` | `scripts/demo-reset.ts` only | public address of the prefunded wallet imported into the browser |
| `RPC_URL` | forge `--rpc-url`, `scripts/demo-reset.ts` | Alchemy or Infura Sepolia endpoint |
| `PRIVATE_KEY` | `Deploy.s.sol`, `Smoke.s.sol`, `scripts/demo-reset.ts` | the pre-funded testnet wallet, at least 0.1 Sepolia ETH |
| `DEPLOYED_CONTRACT` | `Smoke.s.sol`, `scripts/demo-reset.ts` | address printed by `Deploy.s.sol` |

The Phase 2 table below still applies for every other key.

---

# Phase 2: real Sepolia escrow behind the adapter (2026-10-20)

## Goal

With `ADAPTER_MODE=real`, escrow reads (status, amount, parties, and the `Deposited` / `Checked` / `Released` / `Refunded` timeline) come from `DecretaEscrow` on Sepolia, so DEMO steps 3, 4 and 6 show chain truth. `ADAPTER_MODE=fake` (default) still runs all 7 steps on seed data.

## Status

All five slices are written. Nothing was built, run or tested: the agent had no shell.

- **Went real:** `realAdapter.getEscrow` (`lib/adapters/real.ts`) reads `getEscrow` through `readEscrow` and the four event kinds through `readEscrowEvents` (`lib/escrow-chain.ts`), with `source: "chain"`. `realAdapter.listEscrows` reads `escrowCount` and loops ids `1..min(count, 50)`.
- **CourtListener boundary hardened:** `lib/courtlistener.ts` has an 8 s timeout, 1 retry only on timeout or 5xx, zod parse and typed `ErrorCode`s, and no seed import.
- **Still on fixtures:**
  - `memo` and party labels: taken from the seed escrow with the same id and docket, else "Payee when met" and "Refund address".
  - Real mode without `NEXT_PUBLIC_CONTRACT_ADDRESS`: escrows fall back to seed (`source: "seed"`).
  - Real mode without `COURTLISTENER_API_TOKEN`: dockets fall back to seed.
  - Fake mode: everything stays on seed.
  - The client poll in `components/escrow-record.tsx`: still status-only, and it appends a placeholder event with the previous tx hash (Phase 3 replaces it with `watchContractEvent`).
- **Register rows** carry state-derived events only. One `getLogs` set per row would cost 4 x 50 calls. In the list, released or refunded rows show `0` ETH, because `getEscrow` zeroes `amount` after payout. The record page restores the amount from the `Deposited` log.
- **Nothing was cut.**

## Decisions

- **Config vs secrets split.** The spec asked for both "one config file" and "no client import of a secret reader", so there are two modules:
  - `lib/config.ts` is client-safe: `NEXT_PUBLIC_*` keys and constants. `lib/chain.ts` (client) and `lib/escrow-chain.ts` (server) both read it.
  - `lib/secrets.ts` is server only and the only reader of `COURTLISTENER_API_TOKEN`, `SEPOLIA_RPC_URL` and `ESCROW_DEPLOY_BLOCK`.
  - `ADAPTER_MODE` is read only in `lib/adapter.ts`.
- **Seed escrow 1 is now `locked`,** with only its `deposited` event. This mirrors the escrow `Smoke.s.sol` creates as id 1 on a fresh contract, and lets "Check the docket now" stamp RELEASED on camera in fake mode.
- **`ApiResult` failure is now `{ ok: false, error: ErrorCode, hint, status, source }`** (`ApiFailure` in `lib/types.ts`). `fail()` in `lib/errors.ts` builds it.
  - Both clients show `hint` with a `Badge`: variant `locked` (ochre, WARN) for `not_configured`, variant `refunded` (bad) otherwise.
- **`COURT_NAMES` moved to `lib/courts.ts`,** so `lib/courtlistener.ts` no longer imports the seed. `lib/data/seed.ts` re-exports it, so `@/lib/data` consumers are unchanged.
- **`GET /api/escrows` has no id to validate.** It now parses an optional `?status=locked|released|refunded` with `escrowListQuery` as its first statement and filters on it. Same route; one new optional query param.
- **`hasLiveDockets()` moved into `lib/adapter.ts`,** so `app/escrows/page.tsx` no longer imports `lib/courtlistener.ts`.
- **Events known only from state get a zero tx hash.** The record shows them without an Etherscan link (`components/escrow-record.tsx`, the `^0x0+$` check). Their `at` is the read time.
- **`app/page.tsx` (outside DEMO) got a one-token change,** `result.error.message` to `result.hint`, because the `ApiResult` type change would otherwise break the build. Its copy was not touched.

## Failed attempts

None.

## Files changed

New:
- `lib/config.ts`, `lib/secrets.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/log.ts`, `lib/courts.ts`
- `lib/escrow-abi.ts`, `lib/escrow-chain.ts`
- `lib/adapters/types.ts`, `lib/adapters/fake.ts`, `lib/adapters/real.ts`
- `.farm-commits.json`

Edited:
- `lib/adapter.ts` (now the selector only), `lib/types.ts`, `lib/courtlistener.ts`, `lib/chain.ts`, `lib/data/seed.ts`
- `app/api/docket/[id]/route.ts`, `app/api/escrows/route.ts`, `app/api/escrows/[id]/route.ts`, `app/escrows/page.tsx`, `app/page.tsx`
- `components/escrow-console.tsx`, `components/escrow-record.tsx`
- `contracts/test/DecretaEscrow.t.sol`
- `package.json` (`zod`, `test:contracts`), `.env.example`, `README.md`, `DEMO.md`, `HANDOFF.md`

Unchanged after review: `contracts/src/DecretaEscrow.sol`, `contracts/script/Smoke.s.sol`, `cre/decreta-docket/main.ts`.

## Commands run

None, no shell.

## Open questions

- **Mock forwarder trust gap.** The Sepolia MockKeystoneForwarder accepts any simulated report, so anyone who runs a simulation against this contract can release a locked escrow. The fix is the production KeystoneForwarder via `setForwarder`, plus a workflow-owner and workflow-id check in `onReport`. That is a contract storage change, so it is asked here, not done. README "Trust model note" says this.
- **Docket id reality.** 68519034 and 69102877 are still illustrative seed ids. Confirm on courtlistener.com that 68519034 is terminated and 69102877 is open. If not, replace them at the five sync points: `lib/data/seed.ts`, the "Try" buttons in `escrow-console.tsx`, `config.staging.json`, `Smoke.s.sol` and `DEMO.md`.
- **Escrow 2 on chain.** `Smoke.s.sol` creates only escrow 1 (docket 68519034). In real mode with a contract set:
  - `/escrows/2` (DEMO step 7) returns `not_found` until a second escrow on 69102877 is locked, for example from `/escrows` with the wallet.
  - `app/page.tsx` calls `getEscrow(2)` through `unwrap`, so the landing page throws to `app/error.tsx` until then.
  - Option A: a second `createEscrow` on 69102877 right after Smoke.
  - Option B: allow `Smoke.s.sol` to lock both. That changes a "leave as is" file, so I am asking first.
- **Landing copy is now stale.** `app/page.tsx:47` says escrow 1's ETH "moved to the plaintiff". Seed escrow 1 is now locked. That page is outside DEMO, so its copy was not edited.
- **`getLogs` range.** `readEscrowEvents` scans from `ESCROW_DEPLOY_BLOCK` to latest. Some RPC free tiers cap `eth_getLogs` block ranges. If the deploy is many days old, the scan can fail and the record falls back to state-only events (`[core] events degraded`). Chunking is Phase 3.
- **Unverified until the runner runs commands:**
  - The TypeScript build. The most likely friction is the viem `getLogs({ strict: true })` arg typing in `lib/escrow-chain.ts`.
  - `forge test`. `vm.expectEmit(bool,bool,bool,bool)` is declared in the local `Vm` interface without forge-std.
  - `npm run seed`.

## Next best step

Phase 3:
- Replace the status-only poll in `escrow-record.tsx` with `watchContractEvent` and a refetch of `/api/escrows/[id]`, so the timeline gains the real `Checked` and `Released` rows without a reload.
- Add wallet connect and tx lifecycle UX, and the payee balance before and after.
- Resolve escrow 2 on chain.

## Env keys the runner must fill

| Key | Read by | Source |
| --- | --- | --- |
| `PRIVATE_KEY` | `Deploy.s.sol`, `Smoke.s.sol` (`vm.envUint`) | the pre-funded `FARM_EVM_PRIVATE_KEY` wallet |
| `RPC_URL` | forge `--rpc-url` | Alchemy or Infura Sepolia endpoint |
| `CRE_FORWARDER` | `Deploy.s.sol` (`vm.envOr`) | `0x15fc6ae953e024d975e77382eeec56a9101f9f88`, the Sepolia MockKeystoneForwarder; check it against docs.chain.link/cre |
| `DEPLOYED_CONTRACT` | `Smoke.s.sol` (`vm.envAddress`) | address printed by `Deploy.s.sol` |
| `COURTLISTENER_API_TOKEN` | `lib/secrets.ts` | courtlistener.com/profile/api/ |
| `SEPOLIA_RPC_URL` | `lib/secrets.ts` (server only) | Alchemy or Infura Sepolia endpoint, can equal `RPC_URL` |
| `ESCROW_DEPLOY_BLOCK` | `lib/secrets.ts` | block number of the Deploy.s.sol tx on sepolia.etherscan.io |
| `ADAPTER_MODE` | `lib/adapter.ts` | `real` after deploy; `fake` for rehearsal |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `lib/config.ts` | address printed by `Deploy.s.sol` |
| `NEXT_PUBLIC_CHAIN_ID` | `lib/config.ts` | `11155111` |

Every `vm.env*` name in `contracts/script/*.s.sol`: `PRIVATE_KEY` (Deploy, Smoke), `CRE_FORWARDER` (Deploy), `DEPLOYED_CONTRACT` (Smoke).

After the deploy, also put the address in `cre/decreta-docket/config.staging.json` `escrowAddress`.

---

# Phase 1: walking skeleton (2026-10-20)

## Goal

Every step of the 90-second script runs end to end on fake data (`ADAPTER_MODE=fake`, the default), and every page and API route reads through one adapter that returns one `ApiResult<T>` shape, so Phase 2 can switch to real data without editing pages.

## Status

All five slices are written. Nothing has been built or run: the agent had no shell. The runner still has to run `npm install`, `npm run build`, `npm run seed` (twice, then diff) and `cd contracts && forge build && forge test`.

- Slice 1 done: `DEMO.md` (7 steps, start route `/escrows`), `CLAUDE.md`.
- Slice 2 done: `lib/types.ts` (all types plus `DocketSource`, `DataSource`, `ApiResult`), `lib/data/seed.ts` (unchanged seed, relative imports), `lib/data.ts` as a barrel, `lib/adapter.ts` (`fakeAdapter`, `realAdapter`, `adapterMode`, `adapter`).
- Slice 3 done: the three route handlers return `ApiResult`. `/`, `/escrows` and `/escrows/[id]` read through `adapter`. Both clients read `body.ok ? body.data : body.error.message`. `scripts/seed.ts` plus the `seed` script and the `tsx` devDependency.
- Slice 4 done: `components/site-nav.tsx`, title template, page titles, `app/error.tsx`, `app/not-found.tsx`, both `loading.tsx` files. Both empty states already existed; their illustration now has real alt text.
- Slice 5 done: `contracts/test/DecretaEscrow.t.sol` (the four required tests plus `test_unmetCheckKeepsFundsLocked`), `ADAPTER_MODE=fake` in `.env.example`, README intro paragraph.

## Decisions

- The "Try" button for the closed docket was `73388204`; it is now `68519034`, so the four sync points (seed, Try buttons, `config.staging.json`, `Smoke.s.sol`) agree.
- `realAdapter.getDocket` maps the existing `DocketLookup` from `lib/courtlistener.ts` into `ApiResult`. With `ADAPTER_MODE=real` and no token, `getDocket` in `lib/courtlistener.ts` still falls back to seed and reports `source: "seed"`.
- `/escrows` builds its docket list by calling `adapter.getDocket` once per distinct docket on the register, instead of importing the seed array. In real mode that is 9 CourtListener reads per render, cached by `revalidate: 120`.
- The landing page (`app/page.tsx`) also reads through the adapter now, because "no page imports the arrays" covers it. Its docket count is the number of distinct dockets on the register (9) rather than the seed length (10). The copy itself was not rewritten.
- The console's "no token" sentence now reads "Demo mode: lookups use the ten demo dockets.", because in fake mode the token is ignored.
- `scripts/seed.ts` writes with a trailing newline and creates `fixtures/` if missing.

## Failed attempts

None.

## Files changed

New: `DEMO.md`, `CLAUDE.md`, `lib/types.ts`, `lib/data/seed.ts`, `lib/adapter.ts`, `app/api/escrows/route.ts`, `app/api/escrows/[id]/route.ts`, `components/site-nav.tsx`, `app/escrows/loading.tsx`, `app/escrows/[id]/loading.tsx`, `scripts/seed.ts`, `contracts/test/DecretaEscrow.t.sol`, `.farm-commits.json`.

Edited: `lib/data.ts`, `lib/courtlistener.ts`, `app/api/docket/[id]/route.ts`, `app/escrows/page.tsx`, `app/escrows/[id]/page.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/error.tsx`, `app/not-found.tsx`, `components/escrow-console.tsx`, `components/escrow-record.tsx`, `package.json`, `.env.example`, `README.md`, `HANDOFF.md`.

## Commands run

None, agent has no shell.

## Open questions

- **Escrow 1 is already RELEASED in the seed.** The phase goal says pressing "Check now" on `/escrows/1` "stamps RELEASED". It shows RELEASED from the start, and pressing the button adds a check event but no new stamp. The seed had to stay unchanged, so the live rehearsal of the stamp is the newly locked escrow (DEMO steps 3 to 6, a local id from 101 up). If the video needs `/escrows/1` to flip on camera, set escrow 1 to `locked` with only its `deposited` event in Phase 2, when it moves onto a real docket anyway.
- **`app/opengraph-image.tsx` holds five raw IDENTITY hexes.** `ImageResponse` cannot read CSS variables, and no tokens module exists besides `app/globals.css`, which is the only tokens file by rule. The values match IDENTITY exactly. Left as is and noted here.
- **The copy grep flags `CLAUDE.md` on purpose.** The dash rule line and the banned word list quote what they ban. No other written file matches.
- **Unverified until the runner runs commands:** the TypeScript build, byte-identical `fixtures/seed.json`, `forge test`. One forge risk: the test file uses `vm.expectRevert(bytes4)` without forge-std. That cheatcode signature exists in Foundry, but it has not been compiled here.
- Human: delete the unused `contracts/src/App.sol` (the agent cannot delete files).
- Nothing was cut.

## Next best step

HANDOFF task 1: real dockets with `ADAPTER_MODE=real`. Set `COURTLISTENER_API_TOKEN` and `ADAPTER_MODE=real` in `.env.local`, find one terminated and one open federal docket, put them into `lib/data/seed.ts` for escrows 1 and 2, and update the four sync points. Then point `realAdapter.listEscrows` and `getEscrow` at `DecretaEscrow` on Sepolia (the `// Phase 2` comments in `lib/adapter.ts`).

---

# Scaffold reference (pre Phase 1)

## 1. Context

**Product:** Decreta. Funds held on-chain that release by themselves when a real US federal court docket closes or records a new filing, checked by a Chainlink CRE workflow.

**Pitch in plain words:** Two parties settle a case, but the payment is only due once the court closes the file. The user opens the page, pastes the docket number, picks the amount and who gets it, and locks the money. When the court system shows the case as closed, the money moves to the right person by itself. Nobody waits for a lawyer's approval email or sends a bank instruction, and every step is recorded on a page anyone can check.

**Hackathon:** BLI Legal Tech Hackathon 2 (Blockchain Legal Institute) on DoraHacks, https://dorahacks.io/hackathon/legal-hack-2026. Prize pool listed as $20,000.

**Deadline:** 2026-11-01 01:01 UTC. Judging runs 5 Nov to 5 Dec 2026, winners on 12 Dec 2026, so the README and the video carry the submission.

**Target track:** General. No tracks were verified because the DoraHacks detail page could not be read. Before submitting, open the detail tab in a browser and check for a Chainlink bounty row. If there is one, tick it in the BUIDL form: the CRE integration already covers it at zero extra hours.

**Verified submission requirement:** register and submit the project as a BUIDL on DoraHacks. Code freshness, AI policy, team size and video length are unknown; check the detail tab.

**Judges:** the mentors are lawyers. Settlement payments and trust accounts are their daily work. Write for them: plain words, the legal use case first, the trust model stated honestly.

## 2. Current state

Identity: see IDENTITY.md (direction D6, archetype L3)

```
IDENTITY.md                    design contract (D6 fieldbook, L3 editorial, M1 rise). Append-only.
app/layout.tsx                 Fraunces + Source Sans 3, sticky solid header, footer
app/globals.css                IDENTITY tokens, decreta-* label/ruled/rise utilities
app/page.tsx                   L3 editorial landing: one column, CTA mid-article, trust model folds
app/escrows/page.tsx           escrow desk (server) wrapping the console
app/escrows/[id]/page.tsx      escrow record (server reads docket, client renders)
app/api/docket/[id]/route.ts   server-side docket preview, keeps the CourtListener token off the client
app/opengraph-image.tsx        1200x630 OG card in the IDENTITY palette
components/escrow-console.tsx  create flow (paste docket, condition, lock) + filterable register
components/escrow-record.tsx   status stamp, docket facts, "check now", on-chain event timeline, polling
lib/data.ts                    types, 10 dockets, 9 escrows, evaluateCondition (the release rule), local storage helpers
lib/courtlistener.ts           CourtListener v4 adapter
lib/chain.ts                   DecretaEscrow adapter (viem)
contracts/src/DecretaEscrow.sol  the one contract: createEscrow, onReport (forwarder only), refundAfterDeadline
contracts/script/Deploy.s.sol    deploys with CRE_FORWARDER (defaults to the Sepolia mock forwarder)
contracts/script/Smoke.s.sol     locks 0.0001 ETH against docket 68519034 on the deployed contract
cre/decreta-docket/main.ts       CRE workflow: Cron -> HTTP per node -> median consensus -> EVM Write
cre/decreta-docket/config.staging.json  schedule, escrow address, watch list
public/logo.svg, app/icon.svg  the one brand mark (D monogram in a ruled frame)
public/illustrations/docket-sheet.svg  stamped docket sheet, used on landing and empty states
```

**Real vs mocked**

- `getDocket()` in `lib/courtlistener.ts`: real CourtListener v4 call when `COURTLISTENER_API_TOKEN` is set, seed dockets otherwise.
- `lockFunds()` and `readEscrowStatus()` in `lib/chain.ts`: real Sepolia via the browser wallet when `NEXT_PUBLIC_CONTRACT_ADDRESS` is set; otherwise `lockFunds` returns a mock receipt and `readEscrowStatus` returns null.
- `runCheck()` in `components/escrow-record.tsx`: always reads the docket for real through `/api/docket`. On the mock path it also plays the CRE release locally so the wow moment can be rehearsed; on the live path it only reads.
- Seed dockets in `lib/data.ts` are ILLUSTRATIVE (realistic courts and number formats, fictional parties and ids). They are not real CourtListener records. Fix this first (task 1).
- The CRE workflow uses the plain HTTP capability with a CRE secret. Confidential HTTP is not wired yet (task 2b).
- `cre/` has no `project.yaml`, `workflow.yaml` or `secrets.yaml`. Generate them with `cre init` (TypeScript template) and move `main.ts` and the config in.
- `contracts/src/App.sol` is the unused template contract. Delete it.

**One-mark proof** (header in `app/layout.tsx`, the only brand image in the header):

```tsx
<Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold">
  <Image src="/logo.svg" alt="" width={28} height={28} unoptimized priority />
  Decreta
</Link>
```

## 3. Mission (in order)

**Day 1, hour 0 (30 min): access.** Run `cre account access` to request CRE access, create a CourtListener account and token, fund a Sepolia wallet at faucets.chain.link. Put the token in `.env.local`.

**Task 1 (1 h): real dockets in the seed.** With the token set, find two real federal dockets on CourtListener: one with `date_terminated` set, one still open with recent filings. Call `GET /api/rest/v4/dockets/{id}/` and confirm both fields come back. Put them in `lib/data.ts` as dockets for escrows 1 and 2 (keep the ids in `escrow-console.tsx`'s "Try" buttons, `config.staging.json` and `Smoke.s.sol` in sync). Done when pasting the closed docket's URL on /escrows shows the real case name and a "Terminated" badge.

**Task 2 (3 h): contract on Sepolia.** Add Foundry tests for `onReport` (forwarder only, release on met, no double release) and `refundAfterDeadline`. Deploy with the commands in `contracts/README.md`:

```bash
cd contracts && forge build && forge test
PRIVATE_KEY=$PK forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
DEPLOYED_CONTRACT=0x... PRIVATE_KEY=$PK forge script script/Smoke.s.sol --rpc-url $RPC_URL --broadcast
```

Verify the `CRE_FORWARDER` default against the CRE docs before deploying. Done when `NEXT_PUBLIC_CONTRACT_ADDRESS` is set, a 0.01 ETH lock from /escrows confirms, and the confirmation card links to a `Deposited` event on Etherscan.

**Task 2b (4 h): CRE workflow end to end.** `cre init`, move `main.ts` in, set the escrow address in config, store the token as a secret. First get the plain HTTP read logging the two dates in `cre workflow simulate`. Then switch the CourtListener call to Confidential HTTP with vault DON secrets so the token is only resolved in the enclave, and check the exact SDK surface against your CLI version's template. Done when `cre workflow simulate decreta-docket --target staging-settings --broadcast` logs `met=true` for the closed docket and a `Released` event shows up on Etherscan.

**Task 3 (1.5 h): live record page.** On the live path, replace the status-only poll in `escrow-record.tsx` with `getLogs` / `watchContractEvent` for `Deposited`, `Checked`, `Released`, `Refunded` filtered by escrow id, so the timeline is built from chain events with real tx links. Show the payee balance before and after. Done when the record page flips from LOCKED to RELEASED within one poll after the simulate run, with no reload.

**Task 4 (1 h): seed escrows on-chain.** Lock two real escrows on the deployed contract, one per real docket from task 1, and point the register's ids 1 and 2 at them. Add the architecture diagram to the README if you change the flow.

**Task 5 (30 min): rehearse the wow moment 3 times.** Paste the closed docket, lock 0.01 ETH, run the simulate with `--broadcast`, watch the record page stamp RELEASED while escrow 2 stays LOCKED.

**Task 6 (2.5 h): ship.** Deploy to Vercel with the three `NEXT_PUBLIC_*`/token env vars, fill the README demo links, record the 90-second video in your own voice, submit the BUIDL.

**The 90-second script:**

- 0 to 15 s: "A settlement pays out when the court closes the case. Today a lawyer checks the docket by hand." Empty form on /escrows.
- 15 to 45 s: paste a real CourtListener URL, case name, court and "Terminated" appear. Choose "Case is terminated", lock 0.01 ETH, show `Deposited` on Etherscan.
- 45 to 75 s: terminal, `cre workflow simulate --broadcast`: the CourtListener response, the token never printed, the consensus result, the report transaction.
- 75 to 90 s: the record page flips from LOCKED to RELEASED, the plaintiff balance rises, escrow 2 on the open docket is still LOCKED. Close: "The court decides. The money follows."

## 4. Constraints

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (no tailwind.config), deploys to Vercel: no custom server, no runtime filesystem writes, no long-lived processes. Route `params` are Promises.
- UI goes through `components/ui/*` primitives with `cn()`. Colors come from tokens in `app/globals.css`; never put a raw hex in a component. Obey IDENTITY.md: sharp radius, Fraunces on every h1/h2, M1 rise motion only, no stat tiles, one column on the landing. Changes to identity go in IDENTITY.md's Amendments, append-only.
- Copy: no em or en dashes, no double hyphens as dashes. No "seamless, leverage, empower, revolutionize, streamline, robust, unlock, elevate, harness, effortless, cutting-edge, delve". Write like a builder talking to a lawyer.
- Keep `evaluateCondition` (lib/data.ts), the workflow's `met` check and the contract in agreement.
- Testnet only. Never commit keys; `.env*` is gitignored except `.env.example`.
- Scope: if something threatens the deadline, cut it (ERC-20 support, the challenge window, the event-sourced watch list) rather than polish. The demo needs one real closed docket, one real open docket, one real release.
- Run `npm run build` after every change and fix it before moving on.

## 5. Definition of done

- Deployed on Vercel at https://decreta.vercel.app with the contract address and CourtListener token set.
- README demo links filled (live URL and video).
- The 90-second flow works end to end: real docket paste, real Sepolia lock, CRE simulate with `--broadcast`, the record page stamps RELEASED, the open-docket escrow stays LOCKED.
- Wow moment rehearsed three times on the closed docket.
- BUIDL submitted on DoraHacks, Chainlink bounty ticked if a row exists.
