"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { explorerTx, isLiveChain } from "@/lib/chain";
import { shortHex } from "@/lib/data";
import type { UseWallet } from "@/lib/use-wallet";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "warn" | "ok" | "bad";

const TONE: Record<Tone, string> = {
  neutral: "border-primary",
  warn: "border-ochre",
  ok: "border-ok",
  bad: "border-bad",
};

function Row({ tone, label, children, action }: { tone: Tone; label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className={cn("flex flex-wrap items-center justify-between gap-3 border-l-4 bg-secondary p-4 text-sm", TONE[tone])}
    >
      <div className="min-w-0 space-y-1">
        <p className="decreta-label text-muted-foreground">{label}</p>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}

function TxLink({ hash }: { hash: string }) {
  return isLiveChain ? (
    <a href={explorerTx(hash)} target="_blank" rel="noopener noreferrer" title={hash} className="break-all underline underline-offset-4">
      {shortHex(hash)} on Etherscan
    </a>
  ) : (
    <span className="break-all" title={hash}>
      receipt {shortHex(hash)}
    </span>
  );
}

function Addr({ value }: { value: string }) {
  return (
    <span className="break-all" title={value}>
      {shortHex(value)}
    </span>
  );
}

/** One named branch per WalletState (lib/wallet-state.ts). */
export function WalletPanel({ wallet }: { wallet: UseWallet }) {
  const { state } = wallet;

  switch (state.status) {
    case "disconnected":
      return (
        <Row
          tone="warn"
          label="Wallet"
          action={
            wallet.hasProvider ? (
              <Button variant="outline" onClick={() => void wallet.connect()}>
                Connect wallet
              </Button>
            ) : undefined
          }
        >
          {wallet.hasProvider
            ? "No wallet connected. Connect the demo wallet to lock Sepolia ETH."
            : "No browser wallet found. Install one, import the demo wallet, then reload this page."}
        </Row>
      );

    case "connecting":
      return (
        <Row tone="neutral" label="Wallet">
          Waiting for the wallet to share an account…
        </Row>
      );

    case "wrong-network":
      return (
        <Row
          tone="warn"
          label="Wrong network"
          action={<Button onClick={() => void wallet.switchNetwork()}>Switch to Sepolia</Button>}
        >
          <Addr value={state.account} /> is on chain {state.chainId}. Decreta locks funds on Sepolia only.
        </Row>
      );

    case "idle":
      return (
        <Row tone="neutral" label={state.simulated ? "Simulated wallet" : "Wallet on Sepolia"}>
          {state.simulated ? (
            <>
              Depositor <Addr value={state.account} />. No contract is set, so nothing leaves this browser.
            </>
          ) : (
            <>
              Connected as <Addr value={state.account} />. Ready to lock.
            </>
          )}
        </Row>
      );

    case "tx-pending":
      return (
        <Row tone="neutral" label="Locking">
          {state.txHash ? (
            <>
              Sent <TxLink hash={state.txHash} />. Waiting for the receipt…
            </>
          ) : (
            "Confirm the lock in your wallet…"
          )}
        </Row>
      );

    case "tx-confirmed":
      return (
        <Row tone="ok" label="Confirmed">
          Escrow No. {state.escrowId} is locked. <TxLink hash={state.txHash} />.
        </Row>
      );

    case "tx-rejected":
      return (
        <Row tone="warn" label="Not sent">
          You closed the wallet. Nothing was sent.
        </Row>
      );

    case "tx-failed":
      return (
        <Row tone="bad" label="Failed">
          The transaction failed: {state.message}.
        </Row>
      );

    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}
