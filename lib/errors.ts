// Typed failure codes for every ApiResult. The UI switches on the code, never on text.
// Relative imports only: lib/types.ts imports this and scripts/seed.ts runs under tsx.

import type { ApiFailure, DataSource } from "./types";

export type ErrorCode =
  | "invalid_input"
  | "not_found"
  | "upstream_timeout"
  | "upstream_error"
  | "parse_failure"
  | "not_configured";

export const HINTS: Record<ErrorCode, string> = {
  invalid_input: "The id must be a positive whole number.",
  not_found: "No record with that id was found.",
  upstream_timeout: "The upstream service did not answer in time. Try again in a moment.",
  upstream_error: "The upstream service returned an error. Check the token and rate limit, then try again.",
  parse_failure: "The upstream answer did not have the expected shape.",
  not_configured: "This read needs a server setting that is not set yet.",
};

export const HTTP_STATUS: Record<ErrorCode, number> = {
  invalid_input: 400,
  not_found: 404,
  upstream_timeout: 504,
  upstream_error: 502,
  parse_failure: 502,
  not_configured: 503,
};

/** Builds the failure branch of ApiResult. The hint defaults to the plain sentence above. */
export function fail(error: ErrorCode, source: DataSource, hint: string = HINTS[error]): ApiFailure {
  return { ok: false, error, hint, status: HTTP_STATUS[error], source };
}
