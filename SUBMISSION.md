# SUBMISSION: Decreta on DoraHacks

Paste-ready fields for the BUIDL form at https://dorahacks.io/hackathon/legal-hack-2026, in the order the DoraHacks BUIDL form usually asks for them. Every field: verify against the live form. Character limits unknown: the hackathon record does not state any, so check each box's counter before pasting.

## 1. BUIDL name

Verify against the live form.

```
Decreta
```

## 2. Logo

Verify against the live form. Upload `public/logo.svg` (the D monogram in a ruled frame). If the form wants a raster, export the same file at 512 x 512 PNG; do not redraw it.

## 3. One-line vision

Verify against the live form. Character limits unknown.

```
Settlement escrow that pays out by itself when a real US federal docket closes, checked by a Chainlink CRE workflow.
```

## 4. Category

Verify against the live form. Pick the closest of: Legal Tech, Infrastructure, DeFi. First choice: Legal Tech.

## 5. Links

Verify against the live form.

| Field | Value |
| --- | --- |
| GitHub | https://github.com/mericcintosun/decreta |
| Website | https://decreta.vercel.app |
| Video | https://decreta.vercel.app/demo-video.mp4 |

## 6. Description

Verify against the live form. Character limits unknown; the text below is about 1,500 characters, and the first paragraph stands alone if the box is short.

```
Two parties settle a federal case and agree the money moves once the court dismisses it. Until then the funds sit in a lawyer's trust account, and a person has to notice the dismissal on PACER and wire the money. Decreta lets the court the parties are already in be the trigger.

How it works: the depositor pastes a CourtListener docket link and sees the real case name, court and status. They pick one docket event (case terminated, or a new filing after a date), a payee, a refund address and a deadline, and lock the funds in DecretaEscrow on Sepolia. A Chainlink CRE workflow reads the docket on a schedule from every DON node, the nodes agree on date_terminated and date_last_filing, and a signed report goes through the CRE forwarder to the contract. A met condition pays the payee in the same transaction. If the deadline passes first, anyone can trigger the refund.

What the demo shows: the escrow desk, a docket lookup with a Terminated badge, a lock, the record page stamped LOCKED, a check that stamps it RELEASED to the plaintiff, and a side by side page where the closed-docket escrow reads RELEASED while the open-docket escrow stays LOCKED.

Honest limits: Sepolia testnet only, not legal advice. A terminated case is not a win, so the event has to match the agreement. There is no challenge window yet, and the Sepolia mock forwarder accepts simulated reports (see SECURITY.md).
```

## 7. Hackathon track

Verify against the live form.

```
General (no tracks verified)
```

From DELIVERY.md, verbatim:

- `entryMode:` unknown (matrix value; treat as automatic on BUIDL submit).
- `action:` register and submit the project as a BUIDL on DoraHacks (https://dorahacks.io/hackathon/legal-hack-2026).

**Note:** if the DoraHacks detail tab shows a Chainlink prize row, tick it in the BUIDL form. The CRE integration (`cre/decreta-docket/main.ts`, see README "Chainlink CRE in this build") already covers it at 0 h.

## What this submission claims

Only what DEMO.md steps 1 to 8 show: the desk (1), the docket lookup (2), the lock (3), the record stamped LOCKED (4), the check (5), RELEASED with the balance line (6), the open-docket escrow staying LOCKED (7), and the side by side page (8). Nothing in the fields above claims mainnet, real client funds, a challenge window or Confidential HTTP.
