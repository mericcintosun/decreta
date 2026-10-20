// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Chainlink CRE consumer interface. The CRE forwarder calls onReport with the
/// DON-signed report produced by cre/decreta-docket/main.ts.
interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/// @title DecretaEscrow
/// @notice Holds ETH against a US federal court docket (CourtListener id).
///         Funds go to `onMet` when the CRE workflow reports the docket
///         condition as met, or back to `onExpiry` once the deadline passes.
///         No party signature releases funds; only the court event or the clock.
contract DecretaEscrow is IReceiver, IERC165 {
    enum Condition {
        Terminated, // docket has a date_terminated
        FilingAfter // docket has a date_last_filing later than filedAfter
    }

    enum Status {
        None,
        Locked,
        Released,
        Refunded
    }

    struct Escrow {
        uint64 docketId;
        Condition condition;
        Status status;
        uint64 filedAfter;
        uint64 deadline;
        address depositor;
        address onMet;
        address onExpiry;
        uint256 amount;
    }

    address public owner;
    address public forwarder;
    uint256 public escrowCount;
    mapping(uint256 => Escrow) private escrows;

    event Deposited(uint256 indexed id, uint64 indexed docketId, address depositor, uint256 amount, Condition condition);
    event Checked(uint256 indexed id, bool conditionMet, uint64 observedAt);
    event Released(uint256 indexed id, address indexed to, uint256 amount);
    event Refunded(uint256 indexed id, address indexed to, uint256 amount);
    event ForwarderUpdated(address forwarder);

    error NotForwarder();
    error NotOwner();
    error NotLocked();
    error InvalidEscrow();
    error DeadlineNotReached();
    error TransferFailed();

    constructor(address forwarder_) {
        owner = msg.sender;
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    /// @notice Lock msg.value against a docket.
    function createEscrow(
        uint64 docketId,
        Condition condition,
        uint64 filedAfter,
        uint64 deadline,
        address onMet,
        address onExpiry
    ) external payable returns (uint256 id) {
        if (msg.value == 0 || docketId == 0 || onMet == address(0) || onExpiry == address(0)) revert InvalidEscrow();
        if (deadline <= block.timestamp) revert InvalidEscrow();
        if (condition == Condition.FilingAfter && filedAfter == 0) revert InvalidEscrow();

        id = ++escrowCount;
        escrows[id] = Escrow({
            docketId: docketId,
            condition: condition,
            status: Status.Locked,
            filedAfter: filedAfter,
            deadline: deadline,
            depositor: msg.sender,
            onMet: onMet,
            onExpiry: onExpiry,
            amount: msg.value
        });
        emit Deposited(id, docketId, msg.sender, msg.value, condition);
    }

    /// @notice CRE entry point. report = abi.encode(uint256 escrowId, bool met, uint64 observedAt).
    function onReport(bytes calldata, bytes calldata report) external override {
        if (msg.sender != forwarder) revert NotForwarder();
        (uint256 id, bool met, uint64 observedAt) = abi.decode(report, (uint256, bool, uint64));

        Escrow storage e = escrows[id];
        if (e.status != Status.Locked) revert NotLocked();
        emit Checked(id, met, observedAt);
        if (!met) return;

        uint256 amount = e.amount;
        e.status = Status.Released;
        e.amount = 0;
        emit Released(id, e.onMet, amount);
        _send(e.onMet, amount);
    }

    /// @notice Anyone may return the funds once the deadline passes without the condition being met.
    function refundAfterDeadline(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.status != Status.Locked) revert NotLocked();
        if (block.timestamp <= e.deadline) revert DeadlineNotReached();

        uint256 amount = e.amount;
        e.status = Status.Refunded;
        e.amount = 0;
        emit Refunded(id, e.onExpiry, amount);
        _send(e.onExpiry, amount);
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return escrows[id];
    }

    function setForwarder(address forwarder_) external {
        if (msg.sender != owner) revert NotOwner();
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
