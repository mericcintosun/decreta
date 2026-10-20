// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {App} from "../src/App.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// Deploys App with the key from the PRIVATE_KEY env var. The farm runner
/// passes PRIVATE_KEY through the process environment (never on argv, so it
/// is not visible in `ps`). Run by hand:
///   PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
contract Deploy {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function run() external returns (App app) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        app = new App();
        vm.stopBroadcast();
    }
}
