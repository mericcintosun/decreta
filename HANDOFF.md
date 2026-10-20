REDEPLOY NEEDED: DecretaEscrow (Phase 5 bytecode change)

Rewritten in Phase 7. Run in this order. Line numbers are the README.md and SECURITY.md lines as of the Phase 7 commit; apply the README copy edits (step 5) after the token replacements (step 4), which do not shift lines.

1. Before the run (human): the wallet behind `FARM_EVM_PRIVATE_KEY` / `PRIVATE_KEY` holds at least 0.1 Sepolia ETH (top up at https://faucets.chain.link/sepolia). Export `PRIVATE_KEY` and `RPC_URL` in the shell: npm does not load `.env.local` for `contracts:*`.
2. Human: `git rm contracts/src/App.sol`. Grep for `App.sol`, `contract App` and `src/App` over `contracts/`, `package.json` and `cre/` finds only the file itself (`contracts/src/App.sol:6`) and the note that says to delete it (`contracts/README.md:27-28`). No script, test or import uses it.
3. `npm run contracts:deploy` (`contracts/script/Deploy.s.sol`). Copy the printed "DecretaEscrow deployed at" address into `NEXT_PUBLIC_CONTRACT_ADDRESS` and `DEPLOYED_CONTRACT`, and the deploy tx block number into `ESCROW_DEPLOY_BLOCK`. Then `npm run contracts:smoke` (`contracts/script/Smoke.s.sol`: `vm.envAddress("DEPLOYED_CONTRACT")` at line 26, one `createEscrow{value: 0.0001 ether}` at line 29, escrow id 1 on docket 68519034). The Smoke `createEscrow` tx hash is the on-chain proof: replace `<SMOKE_CREATE_ESCROW_TX>` in README.md line 10 with it, as a https://sepolia.etherscan.io/tx/ link.
4. Replace every `<NEXT_PUBLIC_CONTRACT_ADDRESS>` token with the new address: README.md line 9 (Contract row, two tokens), README.md line 99 ("Deployed contract" bullet, two tokens) and `SECURITY.md:7` (two tokens). The address part of README.md line 99 and `SECURITY.md:7` must stay byte for byte equal. Also set `escrowAddress` in `cre/decreta-docket/config.staging.json` to the new address.
5. README.md copy edits, now that the lock is real:
   - Line 9: drop the clause " (set by the deploy step; until then the live demo simulates the lock, see What runs where)". The row then ends right after the Etherscan address link.
   - Line 17: replace the whole bullet with "**Lock and check:** the lock on decreta.vercel.app is a real Sepolia transaction; the release comes only from the CRE workflow." (keep the leading "- ").
   - Line 27: drop its first clause, up to and including the semicolon: "With no contract set on the deployment, the lock and the check are simulated in your browser;". Capitalize what is left, so the line reads "With `NEXT_PUBLIC_CONTRACT_ADDRESS` set, the lock is a real Sepolia transaction and the release comes from the CRE workflow."
6. Vercel project env: `NEXT_PUBLIC_CONTRACT_ADDRESS` (the new address), `NEXT_PUBLIC_CHAIN_ID=11155111`, `SEPOLIA_RPC_URL`, `ESCROW_DEPLOY_BLOCK`, plus `ADAPTER_MODE=real` and `COURTLISTENER_API_TOKEN` (step 11). Redeploy. `lib/chain.ts:16` goes live only when the address is set and the chain id is Sepolia.
7. `npm run demo:reset`. It locks escrow 2 on docket 69102877 if none is locked there and rewrites the CRE watch list.
8. `cre workflow simulate decreta-docket --target staging-settings --broadcast`.
9. CRE broadcast proof in README.md (only with real output from step 8; insert nothing until it exists):
   - Insertion point: in `## How it uses Chainlink CRE`, directly after the numbered list (after line 67, the "**EVM Write**" item) and before the sentence "The same release rule lives in three places that must stay in sync".
   - Add the heading `### One run on Sepolia`.
   - Under it, one sentence: "Output of `cre workflow simulate --broadcast` against the deployed contract for escrow 1 on docket 68519034."
   - Then a fenced `text` block with the real terminal lines showing the CourtListener read (no token printed), the median `date_terminated`, and the report tx hash.
   - Then one line: "Released event: https://sepolia.etherscan.io/tx/" followed by the real hash.
10. Try one `/escrows` lock on https://decreta.vercel.app and check that the confirmation card links a `Deposited` event on Etherscan. Then `/escrows/1` should read RELEASED from step 8 and `/escrows/compare` should show RELEASED beside LOCKED.
11. Real case names (human, needs the CourtListener token; the agent could not reach CourtListener):
    1. Set `COURTLISTENER_API_TOKEN` in Vercel and redeploy.
    2. Run `curl -H "Authorization: Token $COURTLISTENER_API_TOKEN" https://www.courtlistener.com/api/rest/v4/dockets/68519034/` and the same for `69102877`.
    3. From each response copy `case_name`, `docket_number`, `court_id`, `date_filed`, `date_terminated` and `date_last_filing` into `lib/data/seed.ts`: lines 43 to 51 for 68519034 (`caseName`, `docketNumber`, `courtId`, `court` via `COURT_NAMES`, `dateFiled`, `dateTerminated`, `dateLastFiling`), lines 54 to 61 for 69102877. If the `court_id` is not a key of `COURT_NAMES` in `lib/courts.ts`, that is a `lib/` change: ask first.
    4. Update the party labels and event lines built from those parties: `onMet` and `onExpiry` at `lib/data/seed.ts:170`, `:171`, `:187` and `:188`; the `ev(...)` texts at `:176` (names Brightline and docket 1:25-cv-04417), `:191` (names Meridian and docket 2:25-cv-01932) and `:192` (last filing date 2026-10-14). Nothing outside `lib/data/seed.ts` holds the names or docket numbers (Grep for Harlow, Brightline, Okafor, Meridian, 1:25-cv-04417, 2:25-cv-01932).
    5. Only after that, delete ", whose case names are illustrative" from `README.md:16`, and replace the ILLUSTRATIVE header comment at `lib/data/seed.ts:5-8` with one saying dockets 68519034 and 69102877 match CourtListener as of the curl date.
    6. Guard: if 68519034 has `date_terminated: null`, or 69102877 has a non-null `date_terminated`, the demo pair breaks. Pick other dockets and change every place that holds the ids (Grep `68519034|69102877`, excluding `node_modules`, at the Phase 7 commit):
       - `lib/data/seed.ts:42`, `:53`, `:164`, `:181`
       - `components/escrow-console.tsx:55`, `:275`, `:295`, `:296`
       - `app/escrows/compare/page.tsx:13`, `:14`
       - `scripts/demo-reset.ts:7`, `:32`, `:33`
       - `cre/decreta-docket/config.staging.json:8`, `:9`
       - `contracts/script/Smoke.s.sol:15`, `:30`
       - `contracts/test/DecretaEscrow.t.sol:15`, `:20`
       - `contracts/README.md:43`
       - `README.md:23` (two), `:25`, `:136`, `:137`, `:138`, and the step 9 sentence above
       - `DEMO.md:19` (two), `:30`
       - `docs/VIDEO.md:9`, `:16`, `:23`; `docs/SCREENSHOTS.md:9`
       - `CLAUDE.md:24`
       - The mentions in HANDOFF.md phase sections are history; leave them.
       A changed Smoke docket id or contract test constant means a new deploy: run steps 3 to 10 again.

# Phase 7: second jury fixes and freeze (2026-10-20)

## Goal

Turn every round 2 panel item that the repo owns into an exact, ordered runner step (Sepolia deploy, CRE broadcast proof, real docket names), confirm the repo still claims nothing it does not run, and freeze the code. No code, UI, contract or schema change.

## Status

Slices 1 to 5 are written. Nothing was cut. Nothing was built, run or tested: the agent had no shell. The live site still simulates the lock and the release until the REDEPLOY list runs.

- Slice 1 (re-check): `Confidential` over README.md, SUBMISSION.md, DEMO.md, SECURITY.md, `docs/`, `app/`, `components/`, `lib/`: **3 hits**, exactly `README.md:65`, `README.md:158`, `SUBMISSION.md:70`. Each states future work or a non-claim. `Not mock` over the same paths: **0 hits**. No file changed.
- Slice 2 (deploy): `contracts/script/Smoke.s.sol` exists, reads `vm.envAddress("DEPLOYED_CONTRACT")` (line 26) and makes one `createEscrow{value: 0.0001 ether}` call (line 29). `contracts/script/Deploy.s.sol` exists. `App.sol` grep: no reference outside the file itself except the delete note in `contracts/README.md:27-28`. REDEPLOY block rewritten (steps 1 to 6).
- Slice 3 (CRE proof): REDEPLOY step 9 names the insertion point by its anchor sentence. README.md has no `One run on Sepolia` heading.
- Slice 4 (case names): `lib/data/seed.ts` untouched. REDEPLOY step 11 holds the curl, the seed lines and the full id Grep list.
- Slice 5 (freeze hygiene): `.gitignore` lines 4 and 5 hold `.env*` and `!.env.example`. `.env.example` already holds every key found (see Decisions), so it is untouched. One known-gap line added to SUBMISSION.md.

Acceptance read-through (by reading files):
- `app/**/route.ts`: the same 4 files (`api/docket/[id]`, `api/escrows`, `api/escrows/[id]`, `api/escrows/confirm`). `package.json` untouched.
- DEMO.md route files exist: `app/escrows/page.tsx`, `app/escrows/[id]/page.tsx`, `app/escrows/compare/page.tsx`, `app/api/docket/[id]/route.ts`, `app/api/escrows/confirm/route.ts`.
- `lib/data/seed.ts`: 19 `    id: ` entries (10 dockets, 9 escrows); escrow 1 locked on 68519034 (line 164), escrow 2 locked on 69102877 (line 181).
- README.md tokens: `<NEXT_PUBLIC_CONTRACT_ADDRESS>` on lines 9 and 99, `<SMOKE_CREATE_ESCROW_TX>` on line 10, nothing new. `SECURITY.md:7` address part equals README line 99's.
- Sameness tripwire over `app/` and `components/` (all 24 hexes, `fade-up`, `float`, `glow-pulse`, `caret-blink`, `pulse-dot`, `--delay`, `--d:`, `backdrop-blur`): 0 hits. One brand mark in the header: `app/layout.tsx:31`, inside the brand `Link` at line 30.

## Decisions

- **REDEPLOY order follows the runner list:** App.sol removal, deploy and Smoke, address tokens, README copy, Vercel env, `demo:reset`, simulate, CRE proof, live check, case names. The old steps 5 (`escrowAddress`) and 6 (token replace) are folded into step 4; the old step 7 (simulate) is step 8 and the new CRE proof step follows it as step 9.
- **README line 27 after the cut** would start with a lowercase " with"; step 5 gives the full resulting sentence so the runner does not guess.
- **Case names not guessed.** Labeled illustrative names are more honest than invented "real" ones. SUBMISSION.md gets one known-gap line because no existing line said the live lock and release are simulated until the deploy; its stack and Description lines are untouched.
- **Env keys.** `process.env.` over `lib/`, `app/`, `scripts/`, `next.config.ts`: `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_DEMO_PLAINTIFF`, `NEXT_PUBLIC_CHAIN_ID`, `ADAPTER_MODE`, `COURTLISTENER_API_TOKEN`, `SEPOLIA_RPC_URL`, `ESCROW_DEPLOY_BLOCK`, `DEMO_WALLET_ADDRESS`, `NEXT_PUBLIC_SITE_URL`. `vm.env` in `contracts/script`: `PRIVATE_KEY`, `CRE_FORWARDER`, `DEPLOYED_CONTRACT`. All 12 are in `.env.example`; `RPC_URL` is there too (forge `--rpc-url`).
- **Secret grep** (`PRIVATE_KEY=0x`, `Token [0-9a-f]{20}`, `sk-`, excluding `node_modules`): 0 real secrets. Before this section was written the grep returned 7 raw matches: 6 are the letters `sk-` inside ordinary words such as the `desk-count` file name (three in older HANDOFF sections, `.farm-delta.md:24` and `:52`, `app/page.tsx:2`), and 1 is the literal `PRIVATE_KEY=0x...` placeholder in `README.md:117`. This bullet adds more of the same word matches.

## Failed attempts

None.

## Files changed

Edited: `HANDOFF.md` (REDEPLOY block, this section, the round 2 ledger), `SUBMISSION.md` (one known-gap line after line 70). New: `.farm-commits.json`.

Untouched: `app/`, `components/`, `lib/`, `contracts/`, `cre/`, `public/`, `scripts/`, `package.json`, `README.md`, `SECURITY.md`, `DEMO.md`, `.env.example`, `.gitignore`, `docs/`.

## Commands run

None, no shell.

## Open questions

- **README "Try it in 60 seconds" step 3 after the deploy.** `README.md:24` says pressing "Check the docket now" stamps RELEASED. On the live path `runCheck` only reads the docket; the release comes from the CRE simulate. Once the contract is set, that line describes the fake path only. Rewording it is a README claim change outside this phase's named edits: should step 5 of REDEPLOY also change it to "the record stamps RELEASED after the CRE workflow runs"?
- **`contracts/src/App.sol`** still needs the human `git rm` (REDEPLOY step 2).
- **Stale checklist line.** The manual submit checklist below mentions `<ADD_VIDEO_URL>`; README.md and SUBMISSION.md already carry https://decreta.vercel.app/demo-video.mp4, so that box is done.
- **Unverified until the runner runs commands:** `npm run build`, `forge test` (12 tests by Grep count), the deploy, Smoke, the simulate, the Vercel redeploy and the live lock.

## Next best step

Runner: REDEPLOY steps 1 to 3 (fund and export, `git rm contracts/src/App.sol`, `contracts:deploy` then `contracts:smoke`), then the rest of the list in order. Farm: video, deck and submission pack items (ledger rows 1, 5, 6, 7). Then the closing commit `faz-7: Second jury fixes and the freeze`, tag `v0.1-hackathon`, push. The code is frozen after that redeploy.

---

# Phase 6: first jury fixes (2026-10-20)

## Goal

Apply the first judge panel's repo findings only: the README says what runs on chain and what runs in the browser, the contract address and the Smoke deposit tx rows are ready for the deploy step to fill, and no repo file claims Confidential HTTP as built. No feature, UI or code change.

## Status

Slices 1 to 4 are written. Nothing was cut. Nothing was built, run or tested: the agent had no shell.

- Slice 1: no file changed. The `Confidential` grep over README.md, SUBMISSION.md, DEMO.md, SECURITY.md, `docs/`, `app/`, `components/` and `lib/` returned exactly the three expected hits (`README.md:58` and `:157` before this phase's edits, now `README.md:65` and `:158`, and `SUBMISSION.md:70`). All three describe it as future work or a non-claim. `Not mock` returned 0 hits.
- Slice 2: README Contract row now reads "(set by the deploy step; until then the live demo simulates the lock, see What runs where)". New README row "Example deposit tx" holds the Smoke tx token that REDEPLOY step 3 fills. The README "Deployed contract" bullet and `SECURITY.md:7` now use `https://sepolia.etherscan.io/address/<NEXT_PUBLIC_CONTRACT_ADDRESS>` instead of `<address>`, so one token replace fills every address line. REDEPLOY steps 2, 3 and 6 reworded, step 8 added. `contracts/script/Smoke.s.sol` checked, not edited: `vm.envAddress("DEPLOYED_CONTRACT")` at line 26 and one `createEscrow{value: 0.0001 ether}` at line 29.
- Slice 3: README `## Bounty table` removed. `## What runs where` added directly under the address table with the three bullets. `App.sol` grep over `contracts/script`, `contracts/test` and `contracts/src/DecretaEscrow.sol`: 0 hits. `__farm` grep over `app`, `components`, `lib` and `next.config.ts`: 0 hits.
- Slice 4: this section, the fix ledger at the end of the file, `.farm-commits.json`.

## Decisions

- **Etherscan URL token.** The address URLs used `<address>`, a second token the deploy step would have to know about. They now use `<NEXT_PUBLIC_CONTRACT_ADDRESS>` too, so a single replace fills the README row, the README bullet and SECURITY.md. The address part of `README.md:99` and `SECURITY.md:7` ("Deployed contract: `<NEXT_PUBLIC_CONTRACT_ADDRESS>` on Sepolia, https://sepolia.etherscan.io/address/<NEXT_PUBLIC_CONTRACT_ADDRESS>.") is byte for byte equal; the sentence after it differs as before (README names the env keys, SECURITY names `lib/config.ts` and the Phase 5 bytecode note). The REDEPLOY block names the token, not an address, so it has no address line to diverge.
- **Slice 1 needed no rewrite.** Every hit already said "next task", "what we would build next" or "nothing claims". The farm's video, deck and submission stack line (fix 1) are not repo text this phase may write.
- **"Try it in 60 seconds" kept as is.** Its closing sentence already says the lock and check are simulated with no contract set, which agrees with What runs where.

## Failed attempts

None.

## Files changed

Edited: `README.md`, `SECURITY.md` (line 7 only), `HANDOFF.md`. New: `.farm-commits.json`.

Untouched: `app/`, `components/`, `lib/`, `cre/`, `contracts/`, `package.json`, `DEMO.md`, `SUBMISSION.md`, `docs/`, `public/__farm.txt`, `.farm-scaffold.json`, `.farm-delta.md`, `.env*`.

## Commands run

None, no shell.

## Open questions

- **Human action: `git rm contracts/src/App.sol`.** The unused template contract. Nothing in `contracts/script`, `contracts/test` or `contracts/src/DecretaEscrow.sol` names it (Grep, 0 hits). The agent cannot delete files.
- **Farm runner files** (`public/__farm.txt`, `.farm-scaffold.json`, `.farm-delta.md`): removal declined for the agent; they are farm runner files and the human decides. Nothing in `app`, `components`, `lib` or `next.config.ts` references `__farm` (Grep, 0 hits).
- **`isLiveChain` also needs the chain id.** `lib/chain.ts:16` is `contractAddress !== null && chainId === sepolia.id`, so Vercel also needs `NEXT_PUBLIC_CHAIN_ID=11155111` (or its default) for the lock to go live. Not checked further: `lib/config.ts` is outside this phase.
- **Commit plan and whole files.** Slices 2 and 3 both edit README.md. If the runner commits whole files, the second `fix(jury)` commit has nothing left to add; HANDOFF.md is kept out of the first commit so the closing `faz-6:` commit is never empty. Allow an empty commit for the second entry, or fold it into the first.
- **Unverified until the runner runs commands:** `npm run build`, `forge test` (12 tests by Grep count), the deploy, Smoke, the Vercel redeploy and the live lock.

## Next best step

Runner: the REDEPLOY list above (deploy, Smoke, fill both tokens, Vercel env, one live lock). Farm: regenerate the video script, deck and submission pack for fixes 1, 4, 5 and 6. Then Jury round 2.

## Panel re-check

- `ConsensusAggregationByFields` with `median`: verified, `cre/decreta-docket/main.ts:107` (`ConsensusAggregationByFields<DocketObservation>({ terminatedDay: median, lastFilingDay: median })`).
- `writeReport`: verified, `cre/decreta-docket/main.ts:138` (`evm.writeReport(runtime, { receiver: config.escrowAddress, report, ... })`).
- `getSecret`: verified, `cre/decreta-docket/main.ts:93` (`runtime.getSecret({ id: "COURTLISTENER_API_TOKEN" })`).
- 12 Foundry tests including `test_onReportRevertsForNonForwarder`: the file declares 12 `function test` entries (Grep count) and `test_onReportRevertsForNonForwarder` sits at `contracts/test/DecretaEscrow.t.sol:50`. That they pass is could not verify: no `forge test` run.
- Seed case names for 68519034 and 69102877 (`lib/data/seed.ts:43` "Harlow Freight LLC v. Brightline Logistics Inc." and `:54` "Okafor v. Meridian Health Partners"): could not verify, these are illustrative seed text and no CourtListener response for either id is in the repo.
- Confidential HTTP as built: not claimed anywhere in the repo text. `main.ts:13` to `:17` says the token comes from CRE secrets in node mode and the Confidential HTTP swap is still a task.

---

# Phase 9: the docket scene and the submission package (2026-10-20)

## Goal

A judge landing on https://decreta.vercel.app sees a staged editorial page: one-sentence sections each with a figure, a desk sentence whose seed numbers count up, a trust diagram to explore, and sections that rise in with M1 on scroll. README, SUBMISSION.md and docs/VIDEO.md are ready to paste. DEMO step 1 (`/escrows`) stays one click from the first viewport.

## Status

All five slices are written and nothing was cut. Nothing was built or run: the agent had no shell.

- Slice 1: `.farm-delta.md` (phase 9) has 7 Diagnosis items, 9 Changes rows and 1 Kept row, with final Grep counts.
- Slice 2: `.decreta-entrance` in `app/globals.css:150-161` (decreta-rise on `view()`, `entry 0% entry 40%`, inside `@media (prefers-reduced-motion: no-preference)` and `@supports (animation-timeline: view())`), and listed in the reduced-motion block. `lib/brand.ts` (`sceneSrc`), `components/scene-slot.tsx`, `outputFileTracingIncludes` in `next.config.ts`. Four plates: `public/illustrations/step-paste.svg`, `step-lock.svg`, `step-agree.svg`, `step-pay.svg`.
- Slice 3: `app/page.tsx` rebuilt on the same rail grid. One-sentence lede, hero `SceneSlot n={1}` at `mt-10 sm:mt-12`, widened 10rem past the column at lg to fill the empty right of the fold. Problem is two sentences. The desk sentence uses `DeskCount` (ETH total as rust Fraunces `text-5xl`). Procedure `<li>`s are one sentence under `SceneSlot n={2..5}`. Trust is one sentence, `TrustDiagram`, then two one-sentence limits.
- Slice 4: footer in `app/layout.tsx` is one sentence plus one links row (contract or the "No contract is set" line, Source, Hackathon).
- Slice 5: README rewritten (top, Try it in 60 seconds, mermaid architecture, 4-command quickstart, bounty table copied from DELIVERY.md, AI use, License), `SUBMISSION.md`, `docs/VIDEO.md`, `docs/SCREENSHOTS.md`, `LICENSE` (MIT, Meric, 2026), one IDENTITY amendment line.

**Scene slots:** all five are SVG fallbacks. `public/brand/` does not exist (Glob returned nothing), so scene 1 shows `docket-sheet.svg` and scenes 2 to 5 show the four step plates. Dropping `public/brand/scene-N.png` in switches each slot without a code change.

## Decisions

- **Hero figure width.** The figure is `lg:w-[calc(100%+10rem)]`. At lg the container is 992px, rail plus gap is 216px and the 65ch column is about 520px, so 10rem more still fits inside the container. The figcaption stays at `max-w-[65ch]`. The trust diagram uses the same widening so five labels fit in one row.
- **Procedure markers.** The figure sits first in each `<li>`, and the image is `block`, so the rust Fraunces marker sits at the top of each plate instead of on a text line.
- **Hero frame** keeps `decreta-ruled p-6` on top of the slot's `border border-border bg-secondary`, per the earlier amendment that ruled paper lives in the figure frame.
- **DeskCount** renders the exact final string on the server and on first client render, then waits for an `IntersectionObserver` hit at 0.6 before counting from zero. The count is skipped under reduced motion, for a zero value, or with no IntersectionObserver. `t.refunded` and the docket count stay plain text: the spec names four counters.
- **TrustDiagram** captions come from the existing trust copy and SECURITY.md (CourtListener as the only source, DON agreement on the two dates, one rotatable forwarder, no owner path to funds, refund after deadline). No digits in it. The node buttons sit in a `role="group"`, and hover, focus and click all select.
- **Problem second sentence** (Kleros) is kept in muted ink. It is the only line that answers "why not crypto escrow", which lawyers will ask.
- **README Try it** uses the fake-mode path ("Check the docket now" on the record) because the live deploy has no contract until the redeploy.
- **Phase 8 copy loss:** "It runs on Sepolia only and is not legal advice" moved off the trust section; the footer sentence carries it.

## Failed attempts

None.

## Files changed

New: `lib/brand.ts`, `components/scene-slot.tsx`, `components/desk-count.tsx`, `components/trust-diagram.tsx`, `public/illustrations/step-paste.svg`, `step-lock.svg`, `step-agree.svg`, `step-pay.svg`, `SUBMISSION.md`, `docs/VIDEO.md`, `docs/SCREENSHOTS.md`, `LICENSE`, `.farm-commits.json`.

Edited: `.farm-delta.md` (overwritten for phase 9), `app/globals.css`, `next.config.ts`, `app/page.tsx`, `app/layout.tsx` (footer only), `README.md`, `IDENTITY.md` (one amendment line), `HANDOFF.md`.

Untouched: `contracts/`, `cre/`, `lib/adapters/`, `lib/chain.ts`, `lib/escrow-chain.ts`, `app/api/`, `scripts/`, `.env*`, `components/escrow-console.tsx`, `components/wallet-panel.tsx`, `SECURITY.md`, `public/logo.svg`, `app/icon.svg`, `public/__farm.txt`, the header and brand link in `app/layout.tsx`. `contracts/script/Smoke.s.sol` still exists. `.gitignore` already holds `.env*` and `!.env.example` (lines 4 and 5).

## Commands run

None, no shell.

## Open questions

- **Unverified until the runner runs commands:**
  - `npm run build`. Risk points: the template literal type on `SceneSlot`'s `fallback` prop, `outputFileTracingIncludes` as a top-level key (it is top level from Next 15, and `package.json` pins `^15.4.5`), and `node:fs` in `lib/brand.ts`, imported only by the server component `scene-slot.tsx`.
  - Whether Tailwind v4 emits `lg:w-[calc(100%+10rem)]` with spaces around the plus sign (it normalizes math operators in arbitrary values). Check the built CSS.
  - The scroll entrance in Chrome (view timelines ship there); Firefox and Safari without support show content with no motion by design.
  - Lighthouse at 390 and 1440 px.
- **CLAUDE.md guardrail** says "No `fs.` in `lib/`". `lib/brand.ts` imports `existsSync` from `node:fs` as the spec requires; it only reads, never writes, and the literal `fs.` does not appear.
- **Desk sentence wording** changed from "have already paid out because their dockets closed or recorded the filing" to "paid out when their docket moved". Same facts from `totals`.
- **SUBMISSION character counts** are estimates; the form's counters decide.

## Next best step

The Phase 6 judge round on the redeployed landing, then the REDEPLOY NEEDED list at the top of this file, then record the video per `docs/VIDEO.md`.

---

# Phase 8: editorial landing pass (2026-10-20)

## Goal

A judge opening https://decreta.vercel.app cold reaches DEMO step 1 (`/escrows`) with one click from the first viewport. The fixes stay inside L3 editorial: one CTA, one left edge, no ruled lines under text, no monospace, a stamp that fits, the trust copy open, and a hackathon link in the footer.

## Status

All five slices are written and nothing was cut. Nothing was built or run, because the agent had no shell.

- Slice 1: `.farm-delta.md` has 10 Diagnosis items, 13 Changes rows and 1 Kept row, plus the final Grep counts.
- Slice 2: `app/page.tsx` is rebuilt on a `max-w-5xl px-4` container.
  - Five sections, each a `lg:grid-cols-[11rem_minmax(0,65ch)]` grid with a rust rail head: "Settlement escrow", "The problem", "The desk today", "Procedure", "Trust".
  - The one filled CTA sits under the lede.
  - The ruled texture is confined to the illustration frame.
  - The compare link is inline text, field names are semibold spans, and the trust copy is two open `<section>`s with Fraunces h3s.
  - `.decreta-margin` in `globals.css` draws the rust margin line at 64rem and up.
- Slice 3: the mobile Menu toggle is now `Button variant="outline" size="sm"`. The footer has a third line linking DoraHacks, and the container moved from `space-y-2` to `space-y-3`. The two Phase 5 paragraphs are byte for byte unchanged.
- Slice 4: the stamp is now `font-size="16" letter-spacing="2"`, and the third data bar is `width="150"`.
- Slice 5: added one IDENTITY amendment line. The README now opens with an addresses table (live, video, contract plus Etherscan placeholder, source, hackathon). `.env.example` already listed all four required keys, so it is untouched.

## Decisions

- **Hero head below lg.** It stacks above the h1 as plain rust label text, not a chip. At lg it sits in the rail.
- **The desk-today section renders only when the register reads.** The CTA moved to the hero, so this section now holds just the sentence. With no data it drops completely, so no bare border is left behind.
- **The compare link** is in the side-by-side sentence, which renders only when that sentence's data guard passes. Otherwise `/escrows/compare` stays reachable from the nav ("Side by side").
- **`decreta-ruled` is still used by the other routes' wrappers** (desk, record, compare, loading, error, not-found). This phase does not touch those layouts.
- **`noopener` count is 10, not 8.** Phase 5 recorded 7 new-tab links, but the repo held 9 before this phase. Each one has `rel="noopener noreferrer"`.
- **Trust text color.** The trust paragraphs moved from `text-muted-foreground` inside the closed details to the body ink at `text-lg`, to match the rest of the column. The words are unchanged.

## Failed attempts

None.

## Files changed

New: `.farm-delta.md`.

Edited: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/site-nav.tsx`, `public/illustrations/docket-sheet.svg`, `IDENTITY.md` (one amendment line), `README.md`, `HANDOFF.md`, `.farm-commits.json` (rewritten for this phase).

Untouched: `lib/`, `contracts/`, `cre/`, `app/api/`, `scripts/`, `.env*`, `components/escrow-console.tsx` (LockTrustLine intact), `components/ui/*`.

## Commands run

None, no shell.

## Open questions

- **Unverified until the runner runs commands:**
  - `npm run build`. Low risk: the only new import is `Button` in `site-nav.tsx`, and the Button props come from `React.ComponentProps<"button">`.
  - Lighthouse at 360, 768 and 1280.
  - The real fold height of the CTA on short phones (below about 700 px tall the lede may push it under the fold).
- **Tailwind arbitrary class** `lg:grid-cols-[11rem_minmax(0,65ch)]` needs Tailwind v4 to emit it. Check it in the build CSS.

## Next best step

Phase 9 scene pass (hero scene and motion), then the REDEPLOY NEEDED list at the top of this file.

---

# Phase 5: security pass (2026-10-20)

## Goal

Harden the escrow contract (reentrancy guard on both payout paths, an owner pause that blocks only new locks, a zero check on `setForwarder`), show the contract and what the lock signs before the wallet popup (DEMO step 3), disclose contract, chain and source in every footer, and write `SECURITY.md`. No new feature, route or dependency.

## Status

All four slices are written. Nothing was compiled, built or tested: the agent had no shell. Nothing was cut.

- Slice 1: `contracts/src/DecretaEscrow.sol` has `_entered` and the `nonReentrant` modifier (line 68) on `onReport` (line 112) and `refundAfterDeadline` (line 130), `paused` plus `setPaused` and `PausedSet`, `Paused()` and `Reentrancy()` errors, the zero check in `setForwarder`, and the two "Open:" comments. Four tests and a `ReentrantPayee` helper in `contracts/test/DecretaEscrow.t.sol`. `lib/escrow-abi.ts` gains `paused`, `setPaused` and the two errors.
- Slice 2: `explorerAddress` in `lib/chain.ts`. `LockTrustLine` in `components/escrow-console.tsx` sits between `<WalletPanel>` and the Lock row: contract (short, `title`, `break-all`), "Copy address" (2 s "Copied"), Etherscan link, and the sentence ending "Nothing else is signed." The fake path reads "No contract is set. Locking is simulated in this browser and signs nothing."
- Slice 3: second footer paragraph in `app/layout.tsx` (contract linked to Etherscan or the "No contract is set" line, chain id from `CHAIN_ID`, source repo link). All 7 new-tab links carry `rel="noopener noreferrer"`.
- Slice 4: `SECURITY.md`, one README sentence in the trust note, this section.

Acceptance read-through (Grep, by the agent):
- `nonReentrant` in `DecretaEscrow.sol`: 3 hits (modifier plus 2 uses).
- `transferFrom|approve|type(uint256).max` in `contracts/src`: 0 hits.
- `rel="noreferrer"` in `app` and `components`: 0. `target="_blank"` and `noopener` sit on the same 7 links.
- `requestAddresses|eth_requestAccounts`: only `lib/use-wallet.ts:84`, inside `connect`, which only the `onClick` in `components/wallet-panel.tsx:66` calls.
- `eth_sign|personal_sign|signMessage|signTypedData`: 0 hits in `app`, `components`, `lib`.
- `switchChain|addChain`: only `lib/use-wallet.ts:96` and `:102`, both with `sepolia`.
- `http://` in `app`, `components`, `lib`: only the `xmlns` line in `app/icon.svg`.
- No `<form` in `app`, `components` or `lib`. The docket lookup fetches `/api/docket/${id}`.
- Secret names (`PRIVATE_KEY`, `COURTLISTENER_API_TOKEN`, `SEPOLIA_RPC_URL`) appear only in server modules under `lib/` (`secrets.ts`, `courtlistener.ts`, `adapters/*`), none in `components`, `app/**/*.tsx` or `lib/use-*.ts`. `NEXT_PUBLIC_*` keys are the contract address, the demo plaintiff address, the chain id and the site URL.
- Tripwire hexes, keyframes, stagger styles and `backdrop-blur` in `app` and `components`: 0 hits. Copy grep over the files written: 0 hits.

## Decisions

- **Token flow.** `createEscrow` credits `msg.value`, which is exact for ETH, so no fee-on-transfer path exists. Funds leave only through `_send` to the stored `onMet` (`onReport`, met) or `onExpiry` (`refundAfterDeadline`, after the deadline). Each value move emits `Deposited`, `Released` or `Refunded` with the address and the amount. `_send` reverts with `TransferFailed` when the call returns false.
- **No withdraw or sweep exists.** The owner can only change the forwarder and the pause flag. The owner cannot move escrowed funds.
- **Every external state-mutating function:** `createEscrow` open (commented), `onReport` forwarder-only plus guard, `refundAfterDeadline` open (commented) plus guard, `setForwarder` and `setPaused` owner-only.
- **Both payout paths** read checks, effects (status, amount zeroed), emit, then `_send` as the last line.
- **Pause blocks `createEscrow` only,** so a pause can never trap funds.
- **`setForwarder(address(0))` reverts `InvalidEscrow`.** The constructor still accepts any forwarder; `Deploy.s.sol` always passes one.
- **Forwarder trust gap: HIGH, parked.** The MockKeystoneForwarder `0x15fc6ae953e024d975e77382eeec56a9101f9f88` accepts any simulated report. Shortest fix path: decode `workflowOwner` from `metadata` per Chainlink's ReceiverTemplate layout; check it against an owner-set `expectedWorkflowOwner`, zero meaning disabled so `cre workflow simulate` keeps working; enable it after a simulate run logs the real metadata; then `setForwarder` to the production KeystoneForwarder. Not done because it touches how `onReport` reads its input (ask-first).
- **Reverting-payee wedge: LOW, parked.** A contract payee whose `receive` reverts blocks release until the deadline, and forever if `onExpiry` reverts too. Shortest fix: credit `claimable[to]` on a failed send and add `claim()` callable only by `to`.
- **Trust line sentence** renders only when a docket is read, the amount is positive and both addresses are valid; otherwise the row shows the contract, copy and Etherscan only. The amount shown is the same `amount` state passed to `lockFunds`.
- **Footer** uses `EXPLORER_BASE` from `lib/config.ts` for the Etherscan link, not `explorerAddress`, because `lib/chain.ts` is a client-side module and the layout is a server component.
- **Blockaid warning.** If MetaMask shows the red Blockaid banner on connect, it may persist after this phase: it comes from domain and contract reputation, which a code change does not fix. Human: record it here if seen.

## Failed attempts

None.

## Files changed

New: `SECURITY.md`.

Edited: `contracts/src/DecretaEscrow.sol`, `contracts/test/DecretaEscrow.t.sol`, `lib/escrow-abi.ts`, `lib/chain.ts`, `components/escrow-console.tsx`, `components/escrow-record.tsx`, `components/escrow-pair.tsx`, `components/wallet-panel.tsx`, `app/layout.tsx`, `README.md`, `HANDOFF.md`, `.farm-commits.json` (12 tracked files plus the plan file).

Untouched: `cre/`, `scripts/`, `app/api/**`, `lib/adapters/**`, `lib/escrow-chain.ts`, `app/opengraph-image.tsx`, `lib/data/seed.ts`, `contracts/script/Smoke.s.sol` (still reads `DEPLOYED_CONTRACT`, `createEscrow` signature unchanged), `contracts/script/Deploy.s.sol`.

## Commands run

None.

## Open questions

- **Unverified until the runner and the human run commands:**
  - `forge build && forge test`, including the 4 new tests. Risk points: `vm.prank` followed by `vm.expectRevert` (the same order the existing tests use), and `try`/`catch` inside `ReentrantPayee.receive`.
  - `npm run build`. Risk point: `escrowAbi` now has `error` entries; viem accepts them, and `scripts/demo-reset.ts` and `lib/escrow-chain.ts` only call functions and events by name.
  - The browser walk: no popup on load, connect after the click, chain prompt 11155111, lock popup amount equals the trust line amount, no mixed-content warning.
- **Strict reading of "HANDOFF opens with REDEPLOY NEEDED".** The line is now line 1, above the old `# HANDOFF: Decreta` title, which moved below this section.
- **Forwarder trust gap** (HIGH) and **reverting-payee wedge** (LOW), see Decisions.

## Next best step

Human: the REDEPLOY steps above, then `forge test`. Then Phase 6 jury round.

---

# HANDOFF: Decreta

You are picking up a working scaffold. Read this whole file, then start on Mission task 1. Keep `npm run build` green after every change.

# Phase 4: second wow, mobile shell and the judged surface (2026-10-20)

## Goal

Add DEMO step 8 (`/escrows/compare`), where the closed-docket escrow flips LOCKED to RELEASED within one 5 s poll while the open-docket escrow stays LOCKED. Make the live URL worth judging: a mobile nav, 44px targets, hashes that never overflow, full OG metadata, a landing page that cannot throw, and copy that matches what shipped.

## Status

All four slices are written. Nothing was built, run or tested; the agent had no shell. Nothing was cut.

- Slice 1: the `SiteNav` "Menu" disclosure (`md:hidden`, `aria-expanded`, `aria-controls="primary-menu"`) and the desktop row `hidden md:flex`. The "Side by side" link was added. Buttons and inputs are now 44px or larger, and the brand link is `min-h-11`.
- Slice 2: the `app/escrows/compare/{page,loading,error}.tsx` files and `components/escrow-pair.tsx` (one `useEscrowLive` per column). `STAMP_TEXT` and `STAMP_COLOR` are exported from `escrow-record.tsx`, which now has the "Compare with the open docket" link.
- Slice 3: every `shortHex(` sits under an element with `title=` and `break-all`. The console docket `Input` is `min-w-0`.
- Slice 4: metadata in `app/layout.tsx` (description is 149 characters), the landing guard and state-true copy, a second landing button, DEMO step 8, the README CRE table and contract line, `DELIVERY.md`, and the IDENTITY amendment.

## Decisions

- **Zero bounty rows.** The only `targetTracks` entry is "General (no tracks verified)" (`kind: main-placement`, `expectedValueUsd: null`, `marginalHours: 0`). No `sponsor-bounty` row exists, so 0 h went to bounty integrations. No new seat was added: one chain (Sepolia), no auth provider, no database, no model provider. CRE stays the core (`cre/decreta-docket/main.ts`).
- **Compare route.**
  - Default `left` is the highest id on docket 68519034. Default `right` is the lowest locked id on 69102877. `?left=`/`?right=` override both.
  - A URL id the adapter does not know is passed to the client with `seed: null`. `useEscrowLive` then looks in localStorage, so "Compare with the open docket" also works for an escrow locked in this browser (fake mode).
  - When `listEscrows` fails, the client shows `ErrorState` with the failure's `hint` and a `router.refresh()` retry. `ErrorState` needs an `onRetry` function, so it cannot be rendered from the server page.
  - The page holds `CLOSED_DOCKET_ID` and `OPEN_DOCKET_ID`, which makes it a sixth docket-id sync point (add it to the CLAUDE.md list next time it is edited).
  - The stamp gets `decreta-stamp-in` only when its status differs from the server-rendered status, so a flip animates and a first paint does not.
- **Button sizes.**
  - `default: min-h-11 px-4 py-2`, `sm: min-h-11 px-3 text-sm`, `lg: min-h-12 px-8`, `icon: h-11 w-11`.
  - `sm` is now `text-sm` instead of `text-xs`, so the register filter chips and the "Try" link buttons get taller.
  - The "Try" buttons keep `h-auto`, but `min-h-11` still applies.
- **Mobile menu panel** is `absolute inset-x-0 top-full` against the sticky header (a positioned ancestor), solid `bg-background`, no blur.
- **The compare link on the record** sits in the record header under the memo, not on the same line as "Back to the escrow desk". That back link lives in `app/escrows/[id]/page.tsx`, outside the component.
- **Landing.**
  - Every adapter call goes through `read()`, which returns `null` on an `ok: false` result or a rejected promise. If the register fails, the register sentence drops. If escrow 1 or its docket is missing, the figcaption drops. The side-by-side paragraph renders only when escrow 1's docket is terminated, escrow 1 is locked or released, and escrow 2 is locked.
  - The caption reads "is locked until the next check" or "moved to the plaintiff on the next check" according to `closed.status`.
- **`app/icon.svg` holds three IDENTITY hexes** (`#f5f2e6`, `#b4552d`, `#26311f`). It is a pre-existing SVG asset, so the strict reading of "hex only in globals.css and opengraph-image.tsx" is not met there. It was left as is because the spec says it stays the favicon.

## Failed attempts

None.

## Files changed

New:
- `app/escrows/compare/page.tsx`, `app/escrows/compare/loading.tsx`, `app/escrows/compare/error.tsx`
- `components/escrow-pair.tsx`
- `DELIVERY.md`

Edited:
- `components/site-nav.tsx`, `components/ui/button.tsx`, `components/ui/input.tsx`
- `components/escrow-record.tsx`, `components/escrow-console.tsx`, `components/wallet-panel.tsx`
- `app/layout.tsx`, `app/page.tsx`
- `.env.example`, `DEMO.md`, `README.md`, `IDENTITY.md` (one amendment line), `HANDOFF.md`, `.farm-commits.json`

Untouched: `contracts/`, `cre/`, `scripts/`, `lib/**`, `app/api/**`, `app/opengraph-image.tsx`, `app/icon.svg`, `app/error.tsx`, `app/not-found.tsx`. The last two render inside the root layout, so the header and nav stay present.

## Commands run

None.

## Open questions

- **Forwarder trust gap is still open.** The MockKeystoneForwarder accepts any simulated report. The fix is the production KeystoneForwarder plus a workflow owner and id check in `onReport`, which is a `DecretaEscrow.sol` change. Asking, not doing.
- **Confidential HTTP in `cre/decreta-docket/main.ts`** is a human task with the `cre` CLI: check the SDK surface against the CLI template, then run `cre workflow simulate`.
- **DoraHacks detail tab.** Open https://dorahacks.io/hackathon/legal-hack-2026 in a browser, check for a Chainlink prize row and opt-in boxes, and follow `DELIVERY.md`.
- **Deployed contract address** is not recorded in this file, so README keeps the `<NEXT_PUBLIC_CONTRACT_ADDRESS>` placeholder. Fill it after deploy.
- **Unverified until the runner runs commands:**
  - The TypeScript build. Likely friction: the tuple inference of `Promise.all` over `read()` in `app/page.tsx`, and `ApiFailure["error"]` imported through `@/lib/data` in `escrow-pair.tsx`.
  - The 360, 768 and 1280 px layouts, the 5 s flip on compare in real mode, Lighthouse, and the absolute `og:image` URL.

## Next best step

Runner: `npm run build`, then walk DEMO steps 1 to 8 at 360 px and 1280 px. Then record the 90-second video, ending on `/escrows/compare`, and submit per `DELIVERY.md`.

---

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

---

# Manual submit checklist (human, after Phase 9)

- [ ] Open the DoraHacks detail tab of https://dorahacks.io/hackathon/legal-hack-2026 in a browser, copy any opt-in text exactly, tick every opt-in box, and tick a Chainlink prize row if one exists (see `DELIVERY.md` and `SUBMISSION.md`).
- [ ] Video recorded per `docs/VIDEO.md`; its URL replaces `<ADD_VIDEO_URL>` in README.md and SUBMISSION.md.
- [ ] After the redeploy, the contract address replaces `<NEXT_PUBLIC_CONTRACT_ADDRESS>` in README.md and SECURITY.md together, byte for byte, with the Smoke `createEscrow` tx hash added to the README.
- [ ] BUIDL submitted with the fields from `SUBMISSION.md` before 2026-11-01 01:01 UTC.

# Phase 6 fix ledger (jury round 1)

- blocker A (Confidential HTTP shown as built) | handled-by-the-farm | the claim lives in the video, deck and SUBMISSION stack line (fix 1); the repo re-check found no claim, so no repo file changed: README.md:65 and :158 and SUBMISSION.md:70 already state it as future work or a non-claim; the video, deck and SUBMISSION stack line are fix 1, handled by the farm
- blocker B (contract row is a placeholder, live demo never touches the chain) | applied | README.md Contract row and new "Example deposit tx" row, README.md "Deployed contract" bullet, SECURITY.md:7, HANDOFF.md REDEPLOY steps 2, 3, 6 and 8; the real lock and tx still wait on the runner's deploy and Smoke
- fix 1 (video scene 9, deck slide 6, the SUBMISSION stack line, video scene 3) | handled-by-the-farm | video, deck and submission pack wording belongs to the farm
- fix 2 (surface: deploy) | applied | same change as blocker B: README.md, SECURITY.md, HANDOFF.md REDEPLOY block
- fix 3 (surface: readme) | applied | README.md: `## Bounty table` removed, `## What runs where` added; `contracts/src/App.sol` removal declined for the agent (cannot delete files, 0 references by Grep, human runs `git rm contracts/src/App.sol`); `public/__farm.txt` and `.farm-*` removal declined for the agent (farm runner files, human decides)
- fix 4 (deck slide 7, the first user, and the source for "250,000+") | handled-by-the-farm | deck content belongs to the farm
- fix 5 (video scenes 1 and 2, open on `/escrows/compare`) | handled-by-the-farm | video script belongs to the farm
- fix 6 (video scene 7, the `cre workflow simulate` cutaway) | handled-by-the-farm | video script belongs to the farm

# Phase 7 fix ledger (jury round 2)

No regressions: `roundDelta.regressions` is empty. Overall 5.5, verdict "fix-then-submit". Order: REPEAT, then NEW.

- 1. "Confidential HTTP kodda yok, ama SUBMISSION stack satırı, deck slide 6 ve video sahne 9 onu kullanılıyormuş gibi gösteriyor." | REPEAT (blocker) | handled-by-the-farm | held in repo, farm item repeats: `Confidential` grep 3 hits (`README.md:65`, `README.md:158`, `SUBMISSION.md:70`), all future work or non-claims; `Not mock` 0 hits; the stack line, deck slide 6 and video scene 9 are the farm's
- 2. "contracts/script/Deploy.s.sol, contracts/script/Smoke.s.sol, Vercel env NEXT_PUBLIC_CONTRACT_ADDRESS, README.md adres tablosu" | REPEAT (rank 4) | runner-step | HANDOFF.md REDEPLOY steps 1 to 6 and 10; Smoke reads `DEPLOYED_CONTRACT` at `contracts/script/Smoke.s.sol:26`, `createEscrow` at `:29`; README.md lines 9, 10, 17, 27, 99 and `SECURITY.md:7` named with exact replacement text; `git rm contracts/src/App.sol` is step 2
- 3. "README.md \"How it uses Chainlink CRE\" bölümü ve video sahne 7" | REPEAT (rank 5) | runner-step (README), handled-by-the-farm (scene 7) | HANDOFF.md REDEPLOY step 9: `### One run on Sepolia` after `README.md:67`, before "The same release rule lives in three places"; nothing inserted until real simulate output exists
- 4. "Vercel env COURTLISTENER_API_TOKEN ve lib/data/seed.ts" | NEW (rank 3) | runner-step | HANDOFF.md REDEPLOY step 11: curl for both ids, `lib/data/seed.ts:43-51`, `:54-61`, `:170`, `:171`, `:176`, `:187`, `:188`, `:191`, `:192`, `README.md:16`, `lib/data/seed.ts:5-8`, and the full id Grep list for the guard; seed left as is
- 5. "video sahne 9 ve sahne 3 seslendirmesi, deck slide 6, SUBMISSION stack satırı" | REPEAT (rank 1) | handled-by-the-farm | video, deck and the farm's submission pack; repo SUBMISSION.md stack and Description lines untouched
- 6. "video sahne 1 ve 2, SUBMISSION.md Description ilk cümlesi, deck slide 7" | REPEAT (rank 2) | handled-by-the-farm | video, deck and the farm's submission pack; repo SUBMISSION.md Description untouched
- 7. "video tüm sahneler ses kaydı" | NEW (rank 6) | handled-by-the-farm | voice recording for every scene belongs to the farm

| Phase 6 fix | Verdict |
| --- | --- |
| blocker A | held in repo, farm repeat |
| blocker B | re-done as runner steps |
| fix 2 | re-done (same as blocker B) |
| fix 3 | held (What runs where resolved per roundDelta); App.sol still pending a human |
| fixes 1, 4, 5, 6 | farm, repeated |

couldNotVerify, with the missing evidence:

- Etherscan address: no contract is deployed; REDEPLOY steps 3 and 4 fill `README.md:9`, `:99` and `SECURITY.md:7`.
- Simulate output: no `cre workflow simulate --broadcast` has run against a real address; REDEPLOY steps 8 and 9 put it under `### One run on Sepolia`.
- `forge test` output: never run by an agent (no shell); the runner pastes it after the build.
- Vercel token: `COURTLISTENER_API_TOKEN` is not set on Vercel, so the live lookup serves seed dockets; REDEPLOY steps 6 and 11.
- Fresh QA scan: none since Phase 9; the runner re-runs it on the live URL after REDEPLOY step 10.
- Real BUIDL record: not submitted yet; the human submits per SUBMISSION.md after the freeze.
