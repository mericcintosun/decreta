# DEMO: Decreta in 90 seconds

**Problem:** A settlement pays out when the court closes the case. Today a lawyer checks the docket by hand.

**Trigger:** the CourtListener docket gets a `date_terminated`. A Chainlink CRE workflow reads it, the DON agrees, and a signed report reaches `DecretaEscrow.onReport`.

**Wow moment:** a federal docket closes and, with nobody clicking anything, the escrowed ETH moves to the plaintiff while the open-docket escrow stays locked. Step 8 shows both on one screen.

**Close:** "The court decides. The money follows."

**Demo start route:** `/escrows`

**Before each cycle:** `npm run demo:reset`. It prints the id the next lock will get and points the CRE watch list at it.

## Steps

1. Show the empty form on the escrow desk. Route file: `app/escrows/page.tsx`.
   Fallback: `app/escrows/page.tsx` reads `adapter.listEscrows()`; with `ADAPTER_MODE=fake` the fake adapter via `lib/adapter.ts` serves the seed register.
2. Paste the CourtListener URL for docket 68519034 (`https://www.courtlistener.com/docket/68519034/`). The case name, the court and the Terminated badge appear. Route file: `components/escrow-console.tsx` via `app/api/docket/[id]/route.ts`.
   Fallback: `app/api/docket/[id]/route.ts` with no `COURTLISTENER_API_TOKEN` serves the seed docket from `lib/data/seed.ts`; `lib/courtlistener.ts` is the live branch.
3. Connect the demo wallet (switch to Sepolia if asked), pick "Case is terminated" and lock 0.01 ETH. The wallet panel goes pending, then confirmed once `/api/escrows/confirm` has read the receipt, and the confirmation card links the `Deposited` tx. Route file: `app/escrows/page.tsx`, `lib/chain.ts` and `app/api/escrows/confirm/route.ts`.
   Fallback: the `lockFunds` mock in `lib/chain.ts` (branch `!isLiveChain`) returns a simulated receipt with a simulated wallet, no confirm route call.
4. Open the record. It is stamped LOCKED and shows "Plaintiff wallet: X ETH". Route file: `app/escrows/[id]/page.tsx`.
   Fallback: the fake adapter via `lib/adapter.ts` for seed ids, and the local branch in `lib/use-escrow-live.ts` for escrows locked in this browser.
5. CRE run. In the terminal, `cre workflow simulate decreta-docket --target staging-settings --broadcast`. On screen, within one 5 s poll, a `Checked` row with its Etherscan link lands on the record. Route file: `app/escrows/[id]/page.tsx` and `lib/use-escrow-live.ts`.
   Fallback: the local branch in `lib/use-escrow-live.ts`; "Check the docket now" plays the CRE check and release locally (`runCheck` in `components/escrow-record.tsx`).
6. The record stamps RELEASED to the plaintiff and the balance line reads "now Y ETH". Route file: `app/escrows/[id]/page.tsx`.
   In `ADAPTER_MODE=real` the stamp, amount, parties, balance and the Deposited, Checked and Released rows with their tx links come from `DecretaEscrow` on Sepolia; only the memo and party labels still come from the seed.
   Fallback: the local branch in `lib/use-escrow-live.ts` with the simulated release from step 5.
7. Open `/escrows/2`, the escrow on the open docket 69102877 that `demo:reset` keeps locked. It stays LOCKED. Route file: `app/escrows/[id]/page.tsx`.
   Fallback: the fake adapter via `lib/adapter.ts` serves seed escrow 2, locked on the same docket.
8. Open `/escrows/compare` (nav "Side by side", or "Compare with the open docket" on the record). The closed-docket escrow reads RELEASED, the open-docket escrow reads LOCKED, side by side. Route file: `app/escrows/compare/page.tsx`.
   Fallback: fake adapter seed escrows 1 and 2; "Check the docket now" on `/escrows/1` then reload compare.

## Fake mode (default, `ADAPTER_MODE=fake`)

Every step runs on seed data with no network calls. The wallet is simulated, the lock returns a mock receipt, and in step 5 the "Check the docket now" button plays the CRE release locally so the stamp can be rehearsed without a terminal.
