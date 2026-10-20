# Contracts (Foundry)

`src/DecretaEscrow.sol` is the only contract. It locks ETH against a
CourtListener docket id and releases it in exactly two ways:

- `onReport(metadata, report)`: called by the Chainlink CRE forwarder with
  `abi.encode(uint256 escrowId, bool met, uint64 observedAt)`. If `met`, funds
  go to `onMet`. Any other caller reverts with `NotForwarder`.
- `refundAfterDeadline(id)`: anyone, after the deadline, sends funds to `onExpiry`.

Conditions: `0 = Terminated` (docket has `date_terminated`), `1 = FilingAfter`
(docket `date_last_filing` is later than `filedAfter`, a unix day start).

```bash
cd contracts
forge build
forge test
PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
DEPLOYED_CONTRACT=0xYourEscrow PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY forge script script/Smoke.s.sol --rpc-url $RPC_URL --broadcast
```

TESTNET ONLY (Ethereum Sepolia, chain id 11155111). The farm app's
contract-deploy step reads the chain id first and refuses mainnet ids, writes
the deployed address back into `.env.local` and README, and saves the explorer
link.

`src/App.sol` is the template placeholder and is no longer used; delete it
(`git rm contracts/src/App.sol`).

## Environment

- `PRIVATE_KEY`: deployer key (testnet wallet). Both scripts read it with
  `vm.envUint("PRIVATE_KEY")` and pass it to `vm.startBroadcast(pk)`, so the key
  travels in the process environment, never as a `--private-key` argument that
  every local process could read from `ps`. The farm runner sets it from
  `FARM_EVM_PRIVATE_KEY` automatically.
- `RPC_URL`: Sepolia RPC (the runner uses `FARM_EVM_RPC_URL`).
- `CRE_FORWARDER` (optional): forwarder allowed to call `onReport`. Defaults to
  the Sepolia MockKeystoneForwarder that `cre workflow simulate --broadcast`
  uses. Check the address in the CRE docs before deploying; the owner can
  change it later with `setForwarder(address)`.
- `DEPLOYED_CONTRACT`: read by `script/Smoke.s.sol`, which locks 0.0001 ETH
  against seed docket 68519034 with the deployer as both payee and refund
  address.
