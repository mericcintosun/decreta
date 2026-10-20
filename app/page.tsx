import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { dockets, escrows, findDocket, totals } from "@/lib/data";

export default function Home() {
  const t = totals(escrows);
  const closed = escrows.find((e) => e.id === 1)!;
  const closedDocket = findDocket(closed.docketId)!;
  const open = escrows.find((e) => e.id === 2)!;
  const openDocket = findDocket(open.docketId)!;

  return (
    <article className="decreta-ruled">
      <div className="mx-auto max-w-prose px-4 py-16 sm:py-24">
        <header className="decreta-seq space-y-6">
          <p className="decreta-label text-primary">Settlement escrow, bound to the docket</p>
          <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">The court decides. The money follows.</h1>
          <p className="text-xl leading-relaxed text-muted-foreground">
            Decreta holds settlement money on-chain and releases it by itself when a real US federal court docket closes,
            or when a new filing lands on it. A Chainlink CRE workflow reads the docket from CourtListener, the network
            agrees on what it saw, and the contract pays the right party. Nobody signs off.
          </p>
        </header>

        <figure className="decreta-rise my-12 border border-border bg-secondary p-3">
          <Image
            src="/illustrations/docket-sheet.svg"
            alt="A docket sheet stamped TERMINATED, with the escrow line marked as paid"
            width={640}
            height={300}
            className="h-auto w-full"
            unoptimized
          />
          <figcaption className="mt-3 text-sm text-muted-foreground">
            Escrow No. 1 in the demo set: {closedDocket.caseName}, {closedDocket.docketNumber}. The docket shows a
            termination date of {closedDocket.dateTerminated}, and {closed.amountEth} ETH moved to the plaintiff on the
            next check.
          </figcaption>
        </figure>

        <section className="space-y-5 text-lg leading-relaxed">
          <h2 className="text-3xl font-semibold">The slow part of a settlement is the last step</h2>
          <p>
            Parties agree on a number. The agreement says the money moves once the court dismisses the case. Until then
            the funds sit in a lawyer&apos;s trust account, and release depends on someone checking PACER, seeing the
            dismissal, and wiring the money. That takes days, it is easy to get wrong, and if the other side does not
            trust the lawyer, both sides pay an escrow company on top.
          </p>
          <p>
            Crypto escrow does not fix this. Kleros moves the dispute to its own jury, and signature-based escrow needs
            both parties to cooperate at exactly the moment they trust each other least. People already in federal
            court do not want a second court. They want the first one to be the trigger.
          </p>
        </section>

        <section className="my-14 border-y-2 border-primary py-8">
          <p className="text-lg leading-relaxed">
            The demo desk holds {t.count} escrows worth {t.totalEth} Sepolia ETH across {dockets.length} federal
            dockets. {t.released} have already paid out because their dockets closed or recorded the filing they were
            waiting for, {t.locked} are still locked, and {t.refunded} went back to the depositor after its deadline
            passed with the case still open.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/escrows">Open the escrow desk</Link>
          </Button>
        </section>

        <section id="how" className="scroll-mt-20 space-y-5 text-lg leading-relaxed">
          <h2 className="text-3xl font-semibold">How a release happens</h2>
          <ol className="list-decimal space-y-4 pl-6 marker:font-display marker:text-primary">
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
              the DON. The nodes agree on <code>date_terminated</code> and <code>date_last_filing</code>, and only
              then is a signed report written to the contract.
            </li>
            <li>
              The contract accepts reports from the CRE forwarder and nobody else. A met condition pays the payee in the
              same transaction. If the deadline passes first, anyone can trigger the refund.
            </li>
          </ol>
          <p>
            Side by side, the difference is plain: {closedDocket.caseName} closed on {closedDocket.dateTerminated} and
            its escrow paid out the next day, while {openDocket.caseName} last saw a filing on{" "}
            {openDocket.dateLastFiling} and its {open.amountEth} ETH is still waiting.
          </p>
        </section>

        <section className="mt-14 space-y-4">
          <h2 className="text-3xl font-semibold">What you are trusting</h2>
          <details className="group border border-border bg-background p-5">
            <summary className="cursor-pointer list-none font-semibold">
              <span className="decreta-label mr-3 text-primary group-open:text-foreground">Read</span>
              The trust model
            </summary>
            <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
              <p>
                The data source is CourtListener, the Free Law Project&apos;s mirror of PACER, which RECAP users and
                bulk imports keep current. If a docket there is stale, the escrow waits; it never pays early on missing
                data, because an absent date reads as &quot;not yet&quot;.
              </p>
              <p>
                The DON reaches consensus on the two dates, so one faulty node cannot invent a dismissal. The contract
                only trusts the forwarder address it was deployed with, and the owner can rotate that address.
              </p>
            </div>
          </details>
          <details className="group border border-border bg-background p-5">
            <summary className="cursor-pointer list-none font-semibold">
              <span className="decreta-label mr-3 text-primary group-open:text-foreground">Read</span>
              Limits we know about
            </summary>
            <div className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
              <p>
                A terminated case is not always a case decided in your favor. Decreta binds money to a docket event, so
                the condition has to match what the settlement agreement actually says. Pick the event, not the
                outcome.
              </p>
              <p>
                There is no challenge window yet. A timelock that lets either side dispute a release for 72 hours is the
                next contract change. It runs on Sepolia only and is not legal advice.
              </p>
            </div>
          </details>
        </section>
      </div>
    </article>
  );
}
