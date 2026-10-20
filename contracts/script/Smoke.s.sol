// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DecretaEscrow} from "../src/DecretaEscrow.sol";

interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envAddress(string calldata name) external view returns (address);
    function addr(uint256 privateKey) external pure returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// One safe interaction with a deployed DecretaEscrow: locks 0.0001 ETH
/// against seed docket 68519034 with "release on termination", a 180 day
/// deadline, and the deployer as both payee and refund address, so the
/// funds always come back to the same wallet.
///   DEPLOYED_CONTRACT=0x... PRIVATE_KEY=$FARM_EVM_PRIVATE_KEY \
///     forge script script/Smoke.s.sol --rpc-url $RPC_URL --broadcast
contract Smoke {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function run() external returns (uint256 id) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        DecretaEscrow escrow = DecretaEscrow(vm.envAddress("DEPLOYED_CONTRACT"));

        vm.startBroadcast(pk);
        id = escrow.createEscrow{value: 0.0001 ether}(
            68519034, DecretaEscrow.Condition.Terminated, 0, uint64(block.timestamp + 180 days), me, me
        );
        vm.stopBroadcast();
    }
}
