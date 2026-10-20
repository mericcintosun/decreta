"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

const NODES = [
  {
    id: "courtlistener",
    label: "CourtListener",
    role: "The Free Law Project's mirror of PACER is the only data source, and a missing date reads as not yet, so a stale docket makes the escrow wait.",
  },
  {
    id: "don",
    label: "DON nodes",
    role: "Each node reads the docket on its own and the network agrees on date_terminated and date_last_filing, so one faulty node cannot invent a dismissal.",
  },
  {
    id: "forwarder",
    label: "CRE forwarder",
    role: "The signed report reaches the contract through one forwarder address, which only the owner can rotate.",
  },
  {
    id: "escrow",
    label: "DecretaEscrow",
    role: "The contract takes reports from that forwarder and nobody else, and the owner has no function that moves escrowed funds.",
  },
  {
    id: "payee",
    label: "Payee",
    role: "A met condition pays the stored payee in the same transaction; if the deadline passes first, anyone can trigger the refund to the depositor.",
  },
] as const;

type NodeId = (typeof NODES)[number]["id"];

export function TrustDiagram() {
  const [selected, setSelected] = useState<NodeId>("courtlistener");
  const current = NODES.find((node) => node.id === selected) ?? NODES[0];

  return (
    <figure className="lg:w-[calc(100%+10rem)]">
      <div role="group" aria-label="Who a release depends on" className="flex flex-col sm:flex-row sm:items-center">
        {NODES.map((node, i) => {
          const active = node.id === selected;
          return (
            <Fragment key={node.id}>
              {i > 0 && <span aria-hidden="true" className="h-4 w-px self-center bg-border sm:h-px sm:w-3 sm:shrink-0" />}
              <button
                type="button"
                aria-pressed={active}
                onMouseEnter={() => setSelected(node.id)}
                onFocus={() => setSelected(node.id)}
                onClick={() => setSelected(node.id)}
                className={cn(
                  "min-h-11 border bg-background px-2 py-2 text-center text-sm font-semibold leading-tight [overflow-wrap:anywhere] sm:min-w-0 sm:flex-1",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "border-primary text-primary" : "border-border text-foreground hover:border-primary"
                )}
              >
                {node.label}
              </button>
            </Fragment>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-4 max-w-[65ch] text-base leading-relaxed">
        <span className="font-semibold">{current.label}.</span> {current.role}
      </p>
    </figure>
  );
}
