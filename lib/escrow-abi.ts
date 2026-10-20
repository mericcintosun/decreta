// DecretaEscrow ABI (contracts/src/DecretaEscrow.sol). Client-safe.
// Enums encode as uint8: Condition { Terminated, FilingAfter },
// Status { None, Locked, Released, Refunded }.

export const depositedEvent = {
  type: "event",
  name: "Deposited",
  inputs: [
    { name: "id", type: "uint256", indexed: true },
    { name: "docketId", type: "uint64", indexed: true },
    { name: "depositor", type: "address", indexed: false },
    { name: "amount", type: "uint256", indexed: false },
    { name: "condition", type: "uint8", indexed: false },
  ],
} as const;

export const checkedEvent = {
  type: "event",
  name: "Checked",
  inputs: [
    { name: "id", type: "uint256", indexed: true },
    { name: "conditionMet", type: "bool", indexed: false },
    { name: "observedAt", type: "uint64", indexed: false },
  ],
} as const;

export const releasedEvent = {
  type: "event",
  name: "Released",
  inputs: [
    { name: "id", type: "uint256", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

export const refundedEvent = {
  type: "event",
  name: "Refunded",
  inputs: [
    { name: "id", type: "uint256", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
  ],
} as const;

export const escrowAbi = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "payable",
    inputs: [
      { name: "docketId", type: "uint64" },
      { name: "condition", type: "uint8" },
      { name: "filedAfter", type: "uint64" },
      { name: "deadline", type: "uint64" },
      { name: "onMet", type: "address" },
      { name: "onExpiry", type: "address" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "docketId", type: "uint64" },
          { name: "condition", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "filedAfter", type: "uint64" },
          { name: "deadline", type: "uint64" },
          { name: "depositor", type: "address" },
          { name: "onMet", type: "address" },
          { name: "onExpiry", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "escrowCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  depositedEvent,
  checkedEvent,
  releasedEvent,
  refundedEvent,
] as const;
