"use client";

import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type Address } from "viem";
import { sepolia } from "viem/chains";
import { injectedProvider, isLiveChain } from "@/lib/chain";
import { mockAddress, type Hex } from "@/lib/data";
import { classifyTxError, txErrorMessage, type WalletState } from "@/lib/wallet-state";

// The browser wallet over window.ethereum with plain viem (no wagmi).
// Fake path (no contract set): reports `idle` with a simulated account, so the
// mock lock in lib/chain.ts needs no wallet at all.

const SIMULATED: WalletState = { status: "idle", account: mockAddress("demo depositor"), simulated: true };

function settled(account: Address | undefined, chainId: number): WalletState {
  if (!account) return { status: "disconnected" };
  if (chainId !== sepolia.id) return { status: "wrong-network", account, chainId };
  return { status: "idle", account, simulated: false };
}

function walletClient() {
  const provider = injectedProvider();
  return provider ? createWalletClient({ chain: sepolia, transport: custom(provider) }) : null;
}

export interface UseWallet {
  state: WalletState;
  /** False until the effect has looked for window.ethereum, and when none exists. */
  hasProvider: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  /** Lock lifecycle, driven by the escrow console. */
  startTx: () => void;
  txSent: (txHash: Hex) => void;
  txConfirmed: (txHash: Hex, escrowId: number) => void;
  txError: (err: unknown) => void;
}

export function useWallet(): UseWallet {
  const [state, setState] = useState<WalletState>(isLiveChain ? { status: "disconnected" } : SIMULATED);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    if (!isLiveChain) return;
    const provider = injectedProvider();
    const wallet = walletClient();
    if (!provider || !wallet) return;
    setHasProvider(true);

    let active = true;
    const sync = async () => {
      try {
        const [account] = await wallet.getAddresses();
        const chainId = await wallet.getChainId();
        if (!active) return;
        const next = settled(account, chainId);
        // A pending lock keeps its state while the wallet stays on the same account and chain.
        setState((prev) =>
          prev.status === "tx-pending" && next.status === "idle" && next.account === prev.account ? prev : next
        );
      } catch {
        if (active) setState({ status: "disconnected" });
      }
    };

    void sync();
    const onAccounts = () => void sync();
    const onChain = () => void sync();
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      active = false;
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const wallet = walletClient();
    if (!isLiveChain || !wallet) return;
    setState({ status: "connecting" });
    try {
      const [account] = await wallet.requestAddresses();
      const chainId = await wallet.getChainId();
      setState(settled(account, chainId));
    } catch {
      setState({ status: "disconnected" });
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    const wallet = walletClient();
    if (!wallet) return;
    try {
      await wallet.switchChain({ id: sepolia.id });
    } catch (err) {
      // 4902: the wallet does not know Sepolia yet. Add it, which also switches.
      const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
      if (e?.code === 4902 || e?.cause?.code === 4902) {
        try {
          await wallet.addChain({ chain: sepolia });
        } catch {
          return;
        }
      } else {
        return;
      }
    }
    try {
      const [account] = await wallet.getAddresses();
      setState(settled(account, await wallet.getChainId()));
    } catch {
      setState({ status: "disconnected" });
    }
  }, []);

  const startTx = useCallback(() => {
    setState((prev) => ("account" in prev ? { status: "tx-pending", account: prev.account, txHash: null } : prev));
  }, []);

  const txSent = useCallback((txHash: Hex) => {
    setState((prev) => (prev.status === "tx-pending" ? { ...prev, txHash } : prev));
  }, []);

  const txConfirmed = useCallback((txHash: Hex, escrowId: number) => {
    setState((prev) => ("account" in prev ? { status: "tx-confirmed", account: prev.account, txHash, escrowId } : prev));
  }, []);

  const txError = useCallback((err: unknown) => {
    setState((prev) => {
      if (!("account" in prev)) return prev;
      return classifyTxError(err) === "tx-rejected"
        ? { status: "tx-rejected", account: prev.account }
        : { status: "tx-failed", account: prev.account, message: txErrorMessage(err) };
    });
  }, []);

  return { state, hasProvider, connect, switchNetwork, startTx, txSent, txConfirmed, txError };
}
