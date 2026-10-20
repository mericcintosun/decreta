// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DecretaEscrow} from "../src/DecretaEscrow.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function parseAddress(string calldata value) external pure returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// Deploys DecretaEscrow with the key from the PRIVATE_KEY env var. The farm
/// runner passes PRIVATE_KEY through the process environment (never on argv,
/// so it is not visible in `ps`). Run by hand:
///   PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
///
/// CRE_FORWARDER is the Chainlink forwarder allowed to call onReport. The
/// default is the Sepolia MockKeystoneForwarder used by `cre workflow simulate
/// --broadcast`; verify it against the CRE docs and call setForwarder() with
/// the production KeystoneForwarder once the workflow is deployed.
contract Deploy {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    address constant CONSOLE = 0x000000000000000000636F6e736F6c652e6c6f67;

    function run() external returns (DecretaEscrow escrow) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address forwarder =
            vm.envOr("CRE_FORWARDER", vm.parseAddress("0x15fc6ae953e024d975e77382eeec56a9101f9f88"));
        vm.startBroadcast(pk);
        escrow = new DecretaEscrow(forwarder);
        vm.stopBroadcast();
        _log("DecretaEscrow deployed at", address(escrow));
        _log("CRE forwarder", forwarder);
    }

    function _log(string memory label, address value) private view {
        (bool ok,) = CONSOLE.staticcall(abi.encodeWithSignature("log(string,address)", label, value));
        ok;
    }
}
