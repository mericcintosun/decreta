# HANDOFF: Decreta

You are picking up a working scaffold. Read this whole file, then start on Mission task 1. Keep `npm run build` green after every change.

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
