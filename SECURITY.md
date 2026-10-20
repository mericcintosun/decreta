# Security

Decreta is a Sepolia testnet project. Do not send mainnet funds to any address here.

## 1. Contract and chain

- Deployed contract: `<NEXT_PUBLIC_CONTRACT_ADDRESS>` on Sepolia, https://sepolia.etherscan.io/address/<address>. The app reads it from `NEXT_PUBLIC_CONTRACT_ADDRESS` (`lib/config.ts`). Phase 5 changed the bytecode, so this address changes after the next deploy; update this line and the README together.
- Chain: Ethereum Sepolia, chain id 11155111.
- Source: `contracts/src/DecretaEscrow.sol`. ETH only.
- Forwarder: `0x15fc6ae953e024d975e77382eeec56a9101f9f88`, the Sepolia MockKeystoneForwarder used by `cre workflow simulate --broadcast`.

Who can call what:

| Function | Who | Guard |
| --- | --- | --- |
| `createEscrow` | anyone, with their own ETH | blocked while `paused` |
| `onReport` | the forwarder only | `NotForwarder`, reentrancy guard |
| `refundAfterDeadline` | anyone, after the deadline, pays only the stored `onExpiry` | reentrancy guard |
| `setForwarder` | owner | `NotOwner`, rejects the zero address |
| `setPaused` | owner | `NotOwner`; stops new locks only, never releases or refunds |

There is no withdraw or sweep function. The owner cannot move escrowed funds. Funds leave only to the stored `onMet` (on a met report) or `onExpiry` (after the deadline).

**Open trust gap (HIGH).** The MockKeystoneForwarder accepts any simulated report, so anyone who runs a simulation against this contract can release a locked escrow to its stored `onMet`. Shortest fix path:

1. Decode `workflowOwner` from `metadata` per Chainlink's ReceiverTemplate layout.
2. Check it against an owner-set `expectedWorkflowOwner`, where zero means disabled so `cre workflow simulate` keeps working.
3. Enable it after a simulate run logs the real metadata.
4. Then `setForwarder` to the production KeystoneForwarder.

**Known limit (LOW).** A contract payee whose `receive` reverts blocks release until the deadline, and forever if `onExpiry` reverts too. Fix: credit `claimable[to]` on a failed send and add a `claim()` callable only by `to`.

## 2. Wallet permissions

The site asks the browser wallet (`lib/use-wallet.ts`, `lib/chain.ts`, plain viem) for these and nothing else:

- `eth_accounts`: silent, on page load, to see whether a wallet is already connected. It opens no popup.
- `eth_requestAccounts`: only when you press "Connect wallet".
- `wallet_switchEthereumChain` to 11155111, and `wallet_addEthereumChain` for Sepolia if the wallet does not know it: only when you press "Switch to Sepolia".
- `eth_sendTransaction`: one call to `createEscrow` on the contract above, carrying `value` (the amount you typed). The page shows the contract address and a plain sentence of what the transaction does before the wallet opens.

The site never asks for `eth_sign`, `personal_sign` or typed data signatures.

## 3. Approvals

None. The contract holds ETH only. There is no ERC-20, no `transferFrom`, and no allowance is ever requested.

## 4. Source

https://github.com/mericcintosun/decreta
