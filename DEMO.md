# DEMO: Decreta in 90 seconds

**Problem:** A settlement pays out when the court closes the case. Today a lawyer checks the docket by hand.

**Trigger:** the CourtListener docket gets a `date_terminated`. A Chainlink CRE workflow reads it, the DON agrees, and a signed report reaches `DecretaEscrow.onReport`.

**Wow moment:** a federal docket closes and, with nobody clicking anything, the escrowed ETH moves to the plaintiff.

**Close:** "The court decides. The money follows."

**Demo start route:** `/escrows`

## Steps

1. Show the empty form on the escrow desk. Route file: `app/escrows/page.tsx`.
2. Paste the CourtListener URL for docket 68519034 (`https://www.courtlistener.com/docket/68519034/`). The case name, the court and the Terminated badge appear. Route file: `components/escrow-console.tsx` via `app/api/docket/[id]/route.ts`.
3. Pick "Case is terminated" and lock 0.01 ETH. The confirmation card shows the `Deposited` tx. Route file: `app/escrows/page.tsx`.
4. Open the record. It is stamped LOCKED. Route file: `app/escrows/[id]/page.tsx`.
5. CRE run. In the terminal, `cre workflow simulate decreta-docket --target staging-settings --broadcast`. On screen, a `Checked` event lands on the record. Route file: `app/escrows/[id]/page.tsx`.
6. The record stamps RELEASED to the plaintiff. Route file: `app/escrows/[id]/page.tsx`.
7. Open `/escrows/2`, the escrow on the open docket 69102877. It stays LOCKED. Route file: `app/escrows/[id]/page.tsx`.

## Fake mode (default, `ADAPTER_MODE=fake`)

Every step runs on seed data with no network calls. The lock returns a mock receipt, and in step 5 the "Check the docket now" button plays the CRE release locally so the stamp can be rehearsed without a terminal.
