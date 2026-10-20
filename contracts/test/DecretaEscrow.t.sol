// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DecretaEscrow} from "../src/DecretaEscrow.sol";

// No forge-std in this repo: a minimal cheatcode interface, as in script/Smoke.s.sol.
interface Vm {
    function prank(address msgSender) external;
    function deal(address who, uint256 newBalance) external;
    function warp(uint256 newTimestamp) external;
    function expectRevert(bytes4 revertData) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
}

/// Tests for the release rule on DecretaEscrow. Docket 68519034 is the closed
/// demo docket (escrow 1); the forwarder stands in for the CRE forwarder.
contract DecretaEscrowTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    uint64 constant DOCKET = 68519034;
    uint256 constant AMOUNT = 0.01 ether;

    address constant FORWARDER = address(0xF0F0);
    address constant PLAINTIFF = address(0xBEEF);
    address constant DEFENDANT = address(0xD00D);

    DecretaEscrow escrow;
    uint64 deadline;

    // Redeclared from DecretaEscrow so vm.expectEmit can match it.
    event Released(uint256 indexed id, address indexed to, uint256 amount);

    function setUp() public {
        vm.warp(1_760_000_000);
        escrow = new DecretaEscrow(FORWARDER);
        deadline = uint64(block.timestamp + 30 days);
        vm.deal(address(this), 1 ether);
    }

    function _lock() internal returns (uint256 id) {
        id = escrow.createEscrow{value: AMOUNT}(
            DOCKET, DecretaEscrow.Condition.Terminated, 0, deadline, PLAINTIFF, DEFENDANT
        );
    }

    function _report(uint256 id, bool met) internal pure returns (bytes memory) {
        return abi.encode(id, met, uint64(1_759_190_400));
    }

    function test_onReportRevertsForNonForwarder() public {
        uint256 id = _lock();
        vm.expectRevert(DecretaEscrow.NotForwarder.selector);
        escrow.onReport("", _report(id, true));
        require(escrow.getEscrow(id).status == DecretaEscrow.Status.Locked, "still locked");
        require(PLAINTIFF.balance == 0, "payee untouched");
    }

    function test_releaseOnMet() public {
        uint256 id = _lock();
        uint256 before = PLAINTIFF.balance;

        vm.prank(FORWARDER);
        escrow.onReport("", _report(id, true));

        DecretaEscrow.Escrow memory e = escrow.getEscrow(id);
        require(e.status == DecretaEscrow.Status.Released, "status released");
        require(e.amount == 0, "amount cleared");
        require(PLAINTIFF.balance == before + AMOUNT, "payee balance rose");
        require(address(escrow).balance == 0, "contract emptied");
    }

    function test_unmetCheckKeepsFundsLocked() public {
        uint256 id = _lock();

        vm.prank(FORWARDER);
        escrow.onReport("", _report(id, false));

        require(escrow.getEscrow(id).status == DecretaEscrow.Status.Locked, "still locked");
        require(address(escrow).balance == AMOUNT, "funds held");
    }

    function test_noDoubleRelease() public {
        uint256 id = _lock();

        vm.prank(FORWARDER);
        escrow.onReport("", _report(id, true));

        vm.prank(FORWARDER);
        vm.expectRevert(DecretaEscrow.NotLocked.selector);
        escrow.onReport("", _report(id, true));

        require(PLAINTIFF.balance == AMOUNT, "paid exactly once");
    }

    function test_refundAfterDeadline() public {
        uint256 id = _lock();

        vm.expectRevert(DecretaEscrow.DeadlineNotReached.selector);
        escrow.refundAfterDeadline(id);

        vm.warp(uint256(deadline) + 1);
        escrow.refundAfterDeadline(id);

        DecretaEscrow.Escrow memory e = escrow.getEscrow(id);
        require(e.status == DecretaEscrow.Status.Refunded, "status refunded");
        require(DEFENDANT.balance == AMOUNT, "refund address paid");
        require(PLAINTIFF.balance == 0, "payee not paid");

        vm.prank(FORWARDER);
        vm.expectRevert(DecretaEscrow.NotLocked.selector);
        escrow.onReport("", _report(id, true));
    }

    function test_releaseEmitsReleased() public {
        uint256 id = _lock();

        vm.expectEmit(true, true, false, true);
        emit Released(id, PLAINTIFF, AMOUNT);
        vm.prank(FORWARDER);
        escrow.onReport("", _report(id, true));
    }

    function test_createRevertsOnZeroValue() public {
        vm.expectRevert(DecretaEscrow.InvalidEscrow.selector);
        escrow.createEscrow{value: 0}(DOCKET, DecretaEscrow.Condition.Terminated, 0, deadline, PLAINTIFF, DEFENDANT);
    }

    function testFuzz_releasePaysExactAmount(uint96 amount) public {
        if (amount == 0) return;
        vm.deal(address(this), uint256(amount));
        uint256 id = escrow.createEscrow{value: amount}(
            DOCKET, DecretaEscrow.Condition.Terminated, 0, deadline, PLAINTIFF, DEFENDANT
        );
        uint256 before = PLAINTIFF.balance;

        vm.prank(FORWARDER);
        escrow.onReport("", _report(id, true));

        require(PLAINTIFF.balance - before == uint256(amount), "payee got exactly the amount");
        require(address(escrow).balance == 0, "contract emptied");
    }
}
