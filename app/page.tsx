import Link from "next/link";
import { DeskCount } from "@/components/desk-count";
import { SceneSlot } from "@/components/scene-slot";
import { TrustDiagram } from "@/components/trust-diagram";
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

const rail = "lg:grid lg:grid-cols-[11rem_minmax(0,65ch)] lg:gap-x-10";
const railHead = "decreta-label mb-4 text-primary lg:mb-0";
const column = "decreta-margin min-w-0 text-lg leading-relaxed lg:pl-8";

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
  // Below lg the grid collapses and each head stacks above its section. Figures may run 10rem past the column at lg.
  return (
    <article className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
      <section className={rail}>
        <p className={`${railHead} lg:pt-4`}>Settlement escrow</p>
        <div className="decreta-margin min-w-0 lg:pl-8">
          <header className="decreta-seq space-y-6 sm:space-y-7">
            <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">The court decides. The money follows.</h1>
            <p className="max-w-[52ch] text-xl leading-snug text-muted-foreground sm:text-2xl">
              Decreta locks settlement money on-chain and pays it out by itself when a real US federal docket closes,
              checked by a Chainlink CRE workflow.
            </p>
            <div className="pt-2 sm:pt-4">
              <Button asChild size="lg">
                <Link href="/escrows">Open the escrow desk</Link>
              </Button>
            </div>
          </header>

          <figure className="decreta-rise mt-10 sm:mt-12 lg:w-[calc(100%+10rem)]">
            <SceneSlot n={1} fallback="/illustrations/docket-sheet.svg"
              alt="A docket sheet stamped TERMINATED, with the escrow line marked as paid"
              width={640}
              height={300}
              className="decreta-ruled p-6"
            />
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

      <section className={`decreta-entrance mt-16 sm:mt-20 ${rail}`}>
        <p className={`${railHead} lg:pt-3`}>The problem</p>
        <div className={`${column} space-y-5`}>
          <h2 className="text-3xl font-semibold">The slow part of a settlement is the last step</h2>
          <p className="max-w-[65ch]">
            The agreement says the money moves once the court dismisses the case, yet until then it sits in a
            lawyer&apos;s trust account and a person has to notice the dismissal and wire the money.
          </p>
          <p className="max-w-[65ch] text-muted-foreground">
            Kleros adds a second court and signature escrow needs both sides to sign at the moment they trust each other
            least, while people already in federal court want the first court to be the trigger.
          </p>
        </div>
      </section>

      {t && (
        <section className={`decreta-entrance mt-16 border-t border-border pt-8 sm:mt-20 ${rail}`}>
          <p className={`${railHead} lg:pt-1.5`}>The desk today</p>
          <div className={column}>
            <p className="max-w-[65ch]">
              The demo desk holds{" "}
              <DeskCount value={Number(t.totalEth)} decimals={2} className="font-display text-5xl leading-none text-primary" />{" "}
              Sepolia ETH in <DeskCount value={t.count} /> escrows across {docketCount} federal dockets, of which{" "}
              <DeskCount value={t.released} /> paid out when their docket moved, <DeskCount value={t.locked} /> are still
              locked and {t.refunded} went back to the depositor after its deadline.
            </p>
          </div>
        </section>
      )}

      <section id="how" className={`mt-16 scroll-mt-20 sm:mt-20 ${rail}`}>
        <p className={`${railHead} lg:pt-3`}>Procedure</p>
        <div className={`${column} space-y-8`}>
          <h2 className="text-3xl font-semibold">How a release happens</h2>
          <ol className="max-w-[65ch] list-decimal space-y-10 pl-6 marker:font-display marker:text-primary">
            <li className="decreta-entrance">
              <SceneSlot n={2} fallback="/illustrations/step-paste.svg"
                alt="A docket sheet with its link line highlighted"
                width={320}
                height={200}
                className="max-w-xs"
              />
              <p className="mt-4">
                The depositor pastes a CourtListener docket link, and both sides see the same case name, court and
                status before any money moves.
              </p>
            </li>
            <li className="decreta-entrance">
              <SceneSlot n={3} fallback="/illustrations/step-lock.svg"
                alt="A strongbox shut with a rust clasp"
                width={320}
                height={200}
                className="max-w-xs"
              />
              <p className="mt-4">
                They pick one docket event, a payee, a refund address and a deadline, and lock the funds in{" "}
                <span className="font-semibold">DecretaEscrow</span> on Sepolia.
              </p>
            </li>
            <li className="decreta-entrance">
              <SceneSlot n={4} fallback="/illustrations/step-agree.svg"
                alt="Three identical slips side by side, each with the same rust stamp"
                width={320}
                height={200}
                className="max-w-xs"
              />
              <p className="mt-4">
                Every ten minutes a Chainlink CRE workflow reads the docket on each DON node, and only when the nodes agree
                on{" "}
                <span className="font-semibold">date_terminated</span> and{" "}
                <span className="font-semibold">date_last_filing</span> is a signed report written to the contract.
              </p>
            </li>
            <li className="decreta-entrance">
              <SceneSlot n={5} fallback="/illustrations/step-pay.svg"
                alt="A sealed envelope leaving a ledger line toward a payee tab"
                width={320}
                height={200}
                className="max-w-xs"
              />
              <p className="mt-4">
                A met condition pays the payee in the same transaction, and if the deadline passes first anyone can
                trigger the refund.
              </p>
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

      <section className={`decreta-entrance mt-16 sm:mt-20 ${rail}`}>
        <p className={`${railHead} lg:pt-3`}>Trust</p>
        <div className={`${column} space-y-6`}>
          <h2 className="text-3xl font-semibold">What you are trusting</h2>
          <section className="space-y-5">
            <h3 className="font-display text-xl font-semibold">The trust model</h3>
            <p className="max-w-[65ch]">
              CourtListener is the only data source, the DON must agree on the two dates, and the contract accepts
              reports from one forwarder address.
            </p>
            <TrustDiagram />
          </section>
          <section className="space-y-3 pt-4">
            <h3 className="font-display text-xl font-semibold">Limits we know about</h3>
            <p className="max-w-[65ch]">
              A terminated case is not a win, so the docket event you pick has to match what the settlement agreement
              actually says.
            </p>
            <p className="max-w-[65ch]">
              There is no 72-hour challenge window yet, so nobody can dispute a release once the report lands.
            </p>
          </section>
        </div>
      </section>
    </article>
  );
}
