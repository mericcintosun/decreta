# Contracts (Foundry)

```bash
forge build
forge test
PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

TESTNET ONLY. The farm app's contract-deploy step reads the chain id first and
refuses mainnet ids, writes the deployed address back into `.env.local` and
README, and saves the explorer link.

## Environment

- `PRIVATE_KEY`: deployer key (testnet wallet). `script/Deploy.s.sol` reads it
  with `vm.envUint("PRIVATE_KEY")` and passes it to `vm.startBroadcast(pk)`, so
  the key travels in the process environment, never as a `--private-key`
  argument that every local process could read from `ps`. The farm runner sets
  it from `FARM_EVM_PRIVATE_KEY` automatically.
- `RPC_URL`: testnet RPC (the runner uses `FARM_EVM_RPC_URL`).

A `script/Smoke.s.sol` (one safe interaction with the deployed contract, address
from `vm.envAddress("DEPLOYED_CONTRACT")`) should follow the same pattern:
`vm.startBroadcast(vm.envUint("PRIVATE_KEY"))`.
