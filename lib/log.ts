// Server log for the core boundary. Log ids, codes, lengths and durations only:
// never a token, a URL that carries a key, or a response body.

export const CORE_LOG_PREFIX = "[core]";

export function coreLog(step: string, meta?: Record<string, string | number | boolean>): void {
  const fields = meta
    ? Object.entries(meta)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  console.log(fields ? `${CORE_LOG_PREFIX} ${step} ${fields}` : `${CORE_LOG_PREFIX} ${step}`);
}
