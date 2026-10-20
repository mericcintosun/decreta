// Seed register for Decreta: 10 dockets and 9 escrows with fixed ids.
// Relative imports only so scripts/seed.ts can run this under tsx.
// Deterministic: no clock reads, no randomness.
//
// The seed dockets are ILLUSTRATIVE: realistic courts and docket-number
// formats with fictional parties and ids. Before recording the demo, swap
// escrows 1 and 2 onto two verified real dockets (one terminated, one open);
// see HANDOFF.md.

import { COURT_NAMES } from "../courts";
import type { DocketSnapshot, Escrow, EscrowEvent, EventKind, Hex, Party } from "../types";

// Deterministic hex so seed hashes and addresses are stable between server
// and client renders without hardcoding long hex literals.
export function hexFrom(seed: string, length: number): string {
  let h = 2166136261;
  let out = "";
  while (out.length < length) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= out.length + 1;
    h = Math.imul(h, 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

export function mockTxHash(seed: string): Hex {
  return `0x${hexFrom(`tx:${seed}`, 64)}`;
}

export function mockAddress(seed: string): Hex {
  return `0x${hexFrom(`addr:${seed}`, 40)}`;
}

export { COURT_NAMES };

export const dockets: DocketSnapshot[] = [
  {
    id: 68519034,
    caseName: "Harlow Freight LLC v. Brightline Logistics Inc.",
    docketNumber: "1:25-cv-04417",
    courtId: "nysd",
    court: COURT_NAMES.nysd,
    natureOfSuit: "190 Contract: Other",
    dateFiled: "2025-05-27",
    dateTerminated: "2026-09-30",
    dateLastFiling: "2026-09-30",
  },
  {
    id: 69102877,
    caseName: "Okafor v. Meridian Health Partners",
    docketNumber: "2:25-cv-01932",
    courtId: "paed",
    court: COURT_NAMES.paed,
    natureOfSuit: "442 Civil Rights: Jobs",
    dateFiled: "2025-04-14",
    dateTerminated: null,
    dateLastFiling: "2026-10-14",
  },
  {
    id: 70044115,
    caseName: "Vantage Solar Holdings v. Pinecrest Energy Co.",
    docketNumber: "4:25-cv-00788",
    courtId: "txsd",
    court: COURT_NAMES.txsd,
    natureOfSuit: "190 Contract: Other",
    dateFiled: "2025-03-03",
    dateTerminated: "2026-08-22",
    dateLastFiling: "2026-08-22",
  },
  {
    id: 70318620,
    caseName: "Delacroix v. Sunline Rideshare Inc.",
    docketNumber: "3:25-cv-02260",
    courtId: "cand",
    court: COURT_NAMES.cand,
    natureOfSuit: "710 Labor: Fair Standards",
    dateFiled: "2025-03-19",
    dateTerminated: null,
    dateLastFiling: "2026-10-02",
  },
  {
    id: 71155309,
    caseName: "Bluehaven Software Ltd. v. Corvid Analytics LLC",
    docketNumber: "1:25-cv-11940",
    courtId: "mad",
    court: COURT_NAMES.mad,
    natureOfSuit: "830 Patent",
    dateFiled: "2025-07-08",
    dateTerminated: "2026-07-11",
    dateLastFiling: "2026-07-11",
  },
  {
    id: 71890442,
    caseName: "Esposito v. Granite State Mutual Insurance Co.",
    docketNumber: "1:26-cv-00215",
    courtId: "nhd",
    court: COURT_NAMES.nhd,
    natureOfSuit: "110 Insurance",
    dateFiled: "2026-02-11",
    dateTerminated: null,
    dateLastFiling: "2026-09-18",
  },
  {
    id: 72203518,
    caseName: "Kestrel Aerial Imaging LLC v. Northgate County",
    docketNumber: "2:26-cv-00341",
    courtId: "wawd",
    court: COURT_NAMES.wawd,
    natureOfSuit: "190 Contract: Other",
    dateFiled: "2026-03-02",
    dateTerminated: null,
    dateLastFiling: "2026-08-29",
  },
  {
    id: 72640091,
    caseName: "Ruiz-Albarran v. Clearwater Property Management",
    docketNumber: "8:26-cv-00906",
    courtId: "flmd",
    court: COURT_NAMES.flmd,
    natureOfSuit: "443 Civil Rights: Accommodations",
    dateFiled: "2026-04-06",
    dateTerminated: "2026-10-06",
    dateLastFiling: "2026-10-06",
  },
  {
    id: 73015776,
    caseName: "Tidewater Marine Supply Co. v. Halvorsen Shipping AS",
    docketNumber: "2:26-cv-00512",
    courtId: "vaed",
    court: COURT_NAMES.vaed,
    natureOfSuit: "120 Marine",
    dateFiled: "2026-05-12",
    dateTerminated: null,
    dateLastFiling: "2026-10-16",
  },
  {
    id: 73388204,
    caseName: "Aldana v. Copperleaf Lending LLC",
    docketNumber: "1:26-cv-02048",
    courtId: "ilnd",
    court: COURT_NAMES.ilnd,
    natureOfSuit: "480 Consumer Credit",
    dateFiled: "2026-03-23",
    dateTerminated: "2026-10-09",
    dateLastFiling: "2026-10-09",
  },
];

function ev(escrowId: number, kind: EventKind, at: string, note: string): EscrowEvent {
  return { kind, at, note, txHash: mockTxHash(`${escrowId}-${kind}-${at}`) };
}

function party(label: string): Party {
  return { label, address: mockAddress(label) };
}

export const escrows: Escrow[] = [
  {
    id: 1,
    docketId: 68519034,
    condition: "terminated",
    filedAfter: null,
    deadline: "2027-03-31",
    amountEth: "0.01",
    memo: "Settlement balance due when the case is dismissed under the stipulation.",
    onMet: party("Harlow Freight LLC (plaintiff)"),
    onExpiry: party("Brightline Logistics Inc. (defendant)"),
    // Locked, mirroring the escrow Smoke.s.sol creates as id 1 on a fresh contract,
    // so pressing "Check the docket now" stamps RELEASED on camera.
    status: "locked",
    events: [
      ev(1, "deposited", "2026-09-12T15:04:00Z", "Brightline locked 0.01 ETH against docket 1:25-cv-04417."),
    ],
  },
  {
    id: 2,
    docketId: 69102877,
    condition: "terminated",
    filedAfter: null,
    deadline: "2027-06-30",
    amountEth: "0.01",
    memo: "Back pay held until the court closes the case after approving the agreement.",
    onMet: party("Adaeze Okafor (plaintiff)"),
    onExpiry: party("Meridian Health Partners (defendant)"),
    status: "locked",
    events: [
      ev(2, "deposited", "2026-09-12T15:11:00Z", "Meridian locked 0.01 ETH against docket 2:25-cv-01932."),
      ev(2, "checked", "2026-10-19T14:00:00Z", "CRE check: case open, last filing 2026-10-14."),
    ],
  },
  {
    id: 3,
    docketId: 70044115,
    condition: "terminated",
    filedAfter: null,
    deadline: "2027-01-31",
    amountEth: "0.85",
    memo: "Final installment of a supply dispute settlement.",
    onMet: party("Vantage Solar Holdings (plaintiff)"),
    onExpiry: party("Pinecrest Energy Co. (defendant)"),
    status: "released",
    events: [
      ev(3, "deposited", "2026-06-30T18:20:00Z", "Pinecrest locked 0.85 ETH against docket 4:25-cv-00788."),
      ev(3, "checked", "2026-08-23T14:00:00Z", "CRE check: date_terminated 2026-08-22 agreed by the DON."),
      ev(3, "released", "2026-08-23T14:00:00Z", "0.85 ETH released to Vantage Solar Holdings."),
    ],
  },
  {
    id: 4,
    docketId: 70318620,
    condition: "filing-after",
    filedAfter: "2026-10-20",
    deadline: "2027-02-28",
    amountEth: "0.60",
    memo: "Class administrator fee, payable once the court files its order after the fairness hearing.",
    onMet: party("Pacific Claims Administration"),
    onExpiry: party("Sunline Rideshare Inc. (defendant)"),
    status: "locked",
    events: [
      ev(4, "deposited", "2026-10-03T16:45:00Z", "Sunline locked 0.60 ETH against docket 3:25-cv-02260."),
      ev(4, "checked", "2026-10-19T14:00:00Z", "CRE check: no filing after 2026-10-20 yet."),
    ],
  },
  {
    id: 5,
    docketId: 71155309,
    condition: "terminated",
    filedAfter: null,
    deadline: "2026-12-31",
    amountEth: "1.20",
    memo: "License fee escrowed while the patent case was pending.",
    onMet: party("Bluehaven Software Ltd. (plaintiff)"),
    onExpiry: party("Corvid Analytics LLC (defendant)"),
    status: "released",
    events: [
      ev(5, "deposited", "2026-05-02T09:30:00Z", "Corvid locked 1.20 ETH against docket 1:25-cv-11940."),
      ev(5, "checked", "2026-07-12T14:00:00Z", "CRE check: date_terminated 2026-07-11 agreed by the DON."),
      ev(5, "released", "2026-07-12T14:00:00Z", "1.20 ETH released to Bluehaven Software Ltd."),
    ],
  },
  {
    id: 6,
    docketId: 71890442,
    condition: "filing-after",
    filedAfter: "2026-09-01",
    deadline: "2026-12-15",
    amountEth: "0.25",
    memo: "Neutral appraiser's fee, due once the joint stipulation hits the docket.",
    onMet: party("Lakes Region Appraisal Group"),
    onExpiry: party("Granite State Mutual Insurance Co. (defendant)"),
    status: "released",
    events: [
      ev(6, "deposited", "2026-08-27T13:05:00Z", "Granite State locked 0.25 ETH against docket 1:26-cv-00215."),
      ev(6, "checked", "2026-09-19T14:00:00Z", "CRE check: new filing on 2026-09-18, after 2026-09-01."),
      ev(6, "released", "2026-09-19T14:00:00Z", "0.25 ETH released to Lakes Region Appraisal Group."),
    ],
  },
  {
    id: 7,
    docketId: 72203518,
    condition: "terminated",
    filedAfter: null,
    deadline: "2026-10-15",
    amountEth: "0.30",
    memo: "Early-resolution bonus that lapsed when the case stayed open past the deadline.",
    onMet: party("Kestrel Aerial Imaging LLC (plaintiff)"),
    onExpiry: party("Northgate County (defendant)"),
    status: "refunded",
    events: [
      ev(7, "deposited", "2026-04-20T17:40:00Z", "Northgate County locked 0.30 ETH against docket 2:26-cv-00341."),
      ev(7, "checked", "2026-10-15T14:00:00Z", "CRE check: case open, last filing 2026-08-29."),
      ev(7, "refunded", "2026-10-16T08:12:00Z", "Deadline passed. 0.30 ETH refunded to Northgate County."),
    ],
  },
  {
    id: 8,
    docketId: 72640091,
    condition: "terminated",
    filedAfter: null,
    deadline: "2027-04-06",
    amountEth: "0.40",
    memo: "Settlement for an ADA accommodation claim, paid on dismissal.",
    onMet: party("Marisol Ruiz-Albarran (plaintiff)"),
    onExpiry: party("Clearwater Property Management (defendant)"),
    status: "released",
    events: [
      ev(8, "deposited", "2026-09-22T11:15:00Z", "Clearwater locked 0.40 ETH against docket 8:26-cv-00906."),
      ev(8, "checked", "2026-10-07T14:00:00Z", "CRE check: date_terminated 2026-10-06 agreed by the DON."),
      ev(8, "released", "2026-10-07T14:00:00Z", "0.40 ETH released to Marisol Ruiz-Albarran."),
    ],
  },
  {
    id: 9,
    docketId: 73015776,
    condition: "filing-after",
    filedAfter: "2026-10-18",
    deadline: "2027-01-15",
    amountEth: "0.75",
    memo: "Cargo security released once the court files the order vacating the vessel arrest.",
    onMet: party("Halvorsen Shipping AS (defendant)"),
    onExpiry: party("Tidewater Marine Supply Co. (plaintiff)"),
    status: "locked",
    events: [
      ev(9, "deposited", "2026-10-17T10:02:00Z", "Tidewater locked 0.75 ETH against docket 2:26-cv-00512."),
      ev(9, "checked", "2026-10-19T14:00:00Z", "CRE check: last filing 2026-10-16, not after 2026-10-18."),
    ],
  },
];
