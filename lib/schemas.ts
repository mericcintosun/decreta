import { z } from "zod";
import type { Hex } from "./types";

// Boundary schemas: route params on the way in, CourtListener and the
// contract on the way back. Nothing crosses the edge unparsed.

const positiveIdParam = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().refine(Number.isSafeInteger));

/** CourtListener docket id from a route segment. */
export const docketIdParam = positiveIdParam;

/** DecretaEscrow id from a route segment. */
export const escrowIdParam = positiveIdParam;

/** Optional query on GET /api/escrows. */
export const escrowListQuery = z.object({
  status: z.enum(["locked", "released", "refunded"]).optional(),
});

/** Body of POST /api/escrows/confirm: the createEscrow transaction hash. */
export const confirmLockBody = z.object({
  txHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .transform((v) => v.toLowerCase() as Hex),
});

/** The 9 fields lib/courtlistener.ts asks for with ?fields=. */
export const courtListenerDocketSchema = z.object({
  id: z.number().int(),
  case_name: z.string().nullish(),
  case_name_short: z.string().nullish(),
  docket_number: z.string().nullish(),
  court_id: z.string(),
  nature_of_suit: z.string().nullish(),
  date_filed: z.string().nullish(),
  date_terminated: z.string().nullish(),
  date_last_filing: z.string().nullish(),
});

export type CourtListenerDocket = z.infer<typeof courtListenerDocketSchema>;

const address = z.custom<Hex>((v) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v));

/** DecretaEscrow.getEscrow(id) as viem decodes the tuple. */
export const onChainEscrowSchema = z.object({
  docketId: z.bigint(),
  condition: z.number().int().min(0).max(1),
  status: z.number().int().min(0).max(3),
  filedAfter: z.bigint(),
  deadline: z.bigint(),
  depositor: address,
  onMet: address,
  onExpiry: address,
  amount: z.bigint(),
});

export type OnChainEscrow = z.infer<typeof onChainEscrowSchema>;
