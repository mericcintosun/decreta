# VIDEO: shot list

Recorded against the live URL, https://decreta.vercel.app, in one take per shot. The hackathon states no video limit; this cut runs 2:30 so a judge sees the problem by 0:20 and the wow (step 6 RELEASED, then step 8 side by side) by 0:45. Keep the total between 2 and 4 minutes.

| Shot | DEMO step | On-screen action | Spoken line | Seconds | Fallback (fake mode) |
| --- | --- | --- | --- | --- | --- |
| 1 | landing | Landing at the fold: h1, one-sentence lede, docket figure. Slow scroll to the desk sentence so the numbers count up. | "A settlement pays when the court closes the case. Today a person checks the docket and wires the money by hand." | 0:00 to 0:12 | Same page, no change. |
| 2 | landing | Scroll through the problem sentence and the four procedure plates. | "Decreta locks the money on-chain and lets the court be the trigger." | 0:12 to 0:20 | Same page. |
| 3 | 1, 2 | Press "Open the escrow desk". Paste docket 68519034. Case name, court and the Terminated badge appear. | "This is a real federal docket on CourtListener, and it is closed." | 0:20 to 0:30 | Seed docket from `lib/data/seed.ts`, same badge. |
| 4 | 6 | Cut to a record already locked on that docket. The check lands and the stamp flips to RELEASED, balance line reads "now Y ETH". | "Nobody clicked release. The workflow read the docket, the nodes agreed, and the money moved to the plaintiff." | 0:30 to 0:38 | On `/escrows/1` press "Check the docket now"; the stamp flips to RELEASED. |
| 5 | 8 | Open `/escrows/compare`. RELEASED on the left, LOCKED on the right. | "Same contract, same workflow. The open case is still locked." | 0:38 to 0:45 | Seed escrows 1 and 2 after the check in shot 4, then reload compare. |
| 6 | 3 | Back on the desk: connect the wallet, pick "Case is terminated", lock 0.01 ETH, show the trust line, then the confirmed card with the `Deposited` link. | "Before the wallet opens you see the contract and exactly what you sign." | 0:45 to 1:10 | Simulated wallet; the mock receipt card. |
| 7 | 4 | Open the new record, stamped LOCKED, plaintiff balance shown. | "The record shows the docket as it stands today and every event on chain." | 1:10 to 1:20 | Local record from this browser. |
| 8 | 5 | Terminal: `cre workflow simulate decreta-docket --target staging-settings --broadcast`. Show the CourtListener read, the consensus result and the report tx; the token is never printed. Cut back as the `Checked` row lands. | "Every node reads CourtListener, they agree on two dates, and a signed report goes to the contract." | 1:20 to 1:50 | Skip the terminal; press "Check the docket now" and say the check is simulated in this mode. |
| 9 | 6 | The new record stamps RELEASED within one poll. | "Released, within one poll." | 1:50 to 2:00 | Local release from shot 8. |
| 10 | 7 | Open `/escrows/2`: still LOCKED on the open docket 69102877. | "The open docket stays locked until the court moves." | 2:00 to 2:10 | Seed escrow 2. |
| 11 | landing | Scroll to Trust: hover each node of the diagram, then the two limits. | "CourtListener is the only data source, the network must agree, and only one forwarder can report. There is no challenge window yet, and this is testnet only." | 2:10 to 2:25 | Same page. |
| 12 | close | Landing h1. | "The court decides. The money follows." | 2:25 to 2:30 | Same page. |

## Before recording

- Run `npm run demo:reset` and note the id it prints for the next lock.
- Prepare one escrow already locked on 68519034 for shot 4 and fire the simulate just before rolling, so the flip lands on camera.
- Browser at 1440 x 900, zoom 100 percent, one tab, notifications off. Wallet holds at least 0.05 Sepolia ETH.

## Dry run

Run the whole list once without recording, with a stopwatch. Note where a shot runs long and trim the spoken line, not the action. Confirm shot 4 flips within one 5 s poll and shot 5 shows RELEASED next to LOCKED.

## Re-record slot

Keep 30 minutes after the first take for one full re-record. If only one shot fails, re-record that shot and cut it in; shots 4 and 5 are the ones that must be clean.

After upload, paste the link into the README addresses table and the SUBMISSION.md links table in place of `<ADD_VIDEO_URL>`.
