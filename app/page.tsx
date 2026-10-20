import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adapter } from "@/lib/adapter";
import { totals } from "@/lib/data";
import type { ApiResult, DocketSnapshot, Escrow } from "@/lib/types";

// The landing never throws: every read that fails drops the sentence that needed it.
async function read<T>(call: () => Promise<ApiResult<T>>): Promise<T | null> {
  try {
    const result = await call();
    return result.ok ? result.data : null;
  } catch {
    return null;
  }
}

async function docketOf(escrow: Escrow | null): Promise<DocketSnapshot | null> {
  return escrow ? read(() => adapter.getDocket(escrow.docketId)) : null;
}

function captionOutcome(escrow: Escrow): string {
  if (escrow.status === "released") return `${escrow.amountEth} ETH moved to the plaintiff on the next check`;
  if (escrow.status === "refunded") return `${escrow.amountEth} ETH went back to the depositor`;
  return `${escrow.amountEth} ETH is locked until the next check`;
}

function closedClause(escrow: Escrow, docket: DocketSnapshot): string | null {
  if (!docket.dateTerminated) return null;
  if (escrow.status === "released") {
    return `${docket.caseName} closed on ${docket.dateTerminated} and its escrow paid out on the next check`;
  }
  if (escrow.status === "locked") {
    return `${docket.caseName} closed on ${docket.dateTerminated}, so its ${escrow.amountEth} ETH pays out on the next check`;
  }
  return null;
}

export default async function Home() {
  const [escrows, closed, open] = await Promise.all([
    read(() => adapter.listEscrows()),
    read(() => adapter.getEscrow(1)),
    read(() => adapter.getEscrow(2)),
  ]);
  const t = escrows ? totals(escrows) : null;
  const docketCount = escrows ? new Set(escrows.map((e) => e.docketId)).size : 0;
  const [closedDocket, openDocket] = await Promise.all([docketOf(closed), docketOf(open)]);

  const sideBySide =
    closed && closedDocket && open && openDocket && open.status === "locked" ? closedClause(closed, closedDocket) : null;

  // L3 editorial grid: an 11rem margin rail for the column heads beside one 65ch reading column.
  // Below lg the grid collapses and each head stacks above its section.
  return (
    <article className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
      <section className="lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10">
        <p className="decreta-label mb-4 text-primary lg:mb-0 lg:pt-4">Settlement escrow</p>
        <div className="decreta-margin min-w-0 lg:pl-8">
          <header className="decreta-seq space-y-6 sm:space-y-7">
            <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">The court decides. The money follows.</h1>
            <p className="max-w-[65ch] text-xl leading-relaxed text-muted-foreground">
              Decreta holds settlement money on-chain and releases it by itself when a real US federal court docket
              closes, or when a new filing lands on it. A Chainlink CRE workflow reads the docket from CourtListener, the
              network agrees on what it saw, and the contract pays the right party. Nobody signs off.
            </p>
            <div className="pt-2 sm:pt-4">
              <Button asChild size="lg">
                <Link href="/escrows">Open the escrow desk</Link>
              </Button>
            </div>
          </header>

          <figure className="decreta-rise mt-16 sm:mt-20">
            <div className="decreta-ruled border border-border bg-secondary p-6">
              <Image
                src="/illustrations/docket-sheet.svg"
                alt="A docket sheet stamped TERMINATED, with the escrow line marked as paid"
                width={640}
                height={300}
                className="h-auto w-full"
                unoptimized
              />
            </div>
            {closed && closedDocket && (
              <figcaption className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                Escrow No. 1 in the demo set: {closedDocket.caseName}, {closedDocket.docketNumber}.{" "}
                {closedDocket.dateTerminated
                  ? `The docket shows a termination date of ${closedDocket.dateTerminated}, and `
                  : "The docket shows no termination date yet, and "}
                {captionOutcome(closed)}.
              </figcaption>
            )}
          </figure>
        </div>
      </section>

      <section className="mt-16 sm:mt-20 lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10">
        <p className="decreta-label mb-4 text-primary lg:mb-0 lg:pt-3">The problem</p>
        <div className="decreta-margin min-w-0 space-y-5 text-lg leading-relaxed lg:pl-8">
          <h2 className="text-3xl font-semibold">The slow part of a settlement is the last step</h2>
          <p className="max-w-[65ch]">
            Parties agree on a number. The agreement says the money moves once the court dismisses the case. Until then
            the funds sit in a lawyer&apos;s trust account, and release depends on someone checking PACER, seeing the
            dismissal, and wiring the money. That takes days, it is easy to get wrong, and if the other side does not
            trust the lawyer, both sides pay an escrow company on top.
          </p>
          <p className="max-w-[65ch]">
            Crypto escrow does not fix this. Kleros moves the dispute to its own jury, and signature-based escrow needs
            both parties to cooperate at exactly the moment they trust each other least. People already in federal
            court do not want a second court. They want the first one to be the trigger.
          </p>
        </div>
      </section>

      {t && (
        <section className="mt-16 border-t border-border pt-8 sm:mt-20 lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10">
          <p className="decreta-label mb-4 text-primary lg:mb-0 lg:pt-1.5">The desk today</p>
          <div className="decreta-margin min-w-0 lg:pl-8">
            <p className="max-w-[65ch] text-lg leading-relaxed">
              The demo desk holds {t.count} escrows worth {t.totalEth} Sepolia ETH across {docketCount} federal
              dockets. {t.released} have already paid out because their dockets closed or recorded the filing they were
              waiting for, {t.locked} are still locked, and {t.refunded} went back to the depositor after the deadline
              passed with the case still open.
            </p>
          </div>
        </section>
      )}

      <section
        id="how"
        className="mt-16 scroll-mt-20 sm:mt-20 lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10"
      >
        <p className="decreta-label mb-4 text-primary lg:mb-0 lg:pt-3">Procedure</p>
        <div className="decreta-margin min-w-0 space-y-5 text-lg leading-relaxed lg:pl-8">
          <h2 className="text-3xl font-semibold">How a release happens</h2>
          <ol className="max-w-[65ch] list-decimal space-y-4 pl-6 marker:font-display marker:text-primary">
            <li>
              The depositor pastes a CourtListener docket link. The desk pulls the case name, court, status and last
              filing date, so both sides see the same record before any money moves.
            </li>
            <li>
              They pick one condition: release when the case is terminated, or release when a new filing appears after a
              chosen date (useful for a fee that depends on an approval order). Then they set a payee, a refund address
              and a deadline, and lock the funds in <span className="font-semibold">DecretaEscrow</span> on Sepolia.
            </li>
            <li>
              Every ten minutes a Chainlink CRE workflow calls CourtListener&apos;s v4 dockets endpoint from each node in
              the DON. The nodes agree on <span className="font-semibold">date_terminated</span> and{" "}
              <span className="font-semibold">date_last_filing</span>, and only then is a signed report written to the
              contract.
            </li>
            <li>
              The contract accepts reports from the CRE forwarder and nobody else. A met condition pays the payee in the
              same transaction. If the deadline passes first, anyone can trigger the refund.
            </li>
          </ol>
          {sideBySide && open && openDocket && (
            <p className="max-w-[65ch]">
              Side by side, the difference is plain: {sideBySide}, while {openDocket.caseName}{" "}
              {openDocket.dateLastFiling
                ? `last saw a filing on ${openDocket.dateLastFiling}`
                : "has no filing date on record"}{" "}
              and its {open.amountEth} ETH is still waiting;{" "}
              <Link href="/escrows/compare" className="underline underline-offset-4 decoration-primary">
                see them side by side
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="mt-16 sm:mt-20 lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10">
        <p className="decreta-label mb-4 text-primary lg:mb-0 lg:pt-3">Trust</p>
        <div className="decreta-margin min-w-0 space-y-8 text-lg leading-relaxed lg:pl-8">
          <h2 className="text-3xl font-semibold">What you are trusting</h2>
          <section className="space-y-3">
            <h3 className="font-display text-xl font-semibold">The trust model</h3>
            <p className="max-w-[65ch]">
              The data source is CourtListener, the Free Law Project&apos;s mirror of PACER, which RECAP users and bulk
              imports keep current. If a docket there is stale, the escrow waits; it never pays early on missing data,
              because an absent date reads as &quot;not yet&quot;.
            </p>
            <p className="max-w-[65ch]">
              The DON reaches consensus on the two dates, so one faulty node cannot invent a dismissal. The contract only
              trusts the forwarder address it was deployed with, and the owner can rotate that address.
            </p>
          </section>
          <section className="space-y-3">
            <h3 className="font-display text-xl font-semibold">Limits we know about</h3>
            <p className="max-w-[65ch]">
              A terminated case is not always a case decided in your favor. Decreta binds money to a docket event, so the
              condition has to match what the settlement agreement actually says. Pick the event, not the outcome.
            </p>
            <p className="max-w-[65ch]">
              There is no challenge window yet. A timelock that lets either side dispute a release for 72 hours is the
              next contract change. It runs on Sepolia only and is not legal advice.
            </p>
          </section>
        </div>
      </section>
    </article>
  );
}
