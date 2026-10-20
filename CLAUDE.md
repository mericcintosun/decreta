# CLAUDE.md: Decreta

IDENTITY.md is law. It overrides your taste. Identity changes go only as dated lines under its "Amendments".

## Commands

- `npm install`, `npm run dev`, `npm run build`, `npm run seed` (writes `fixtures/seed.json`)
- Contracts: `cd contracts && forge build && forge test`
- CRE: `cd cre/decreta-docket && bun install && cre workflow simulate decreta-docket --target staging-settings --broadcast`

## Data flow

- Pages and API routes read through `lib/adapter.ts` (`ADAPTER_MODE=fake` default, `real` reads CourtListener).
- Every API route returns `ApiResult<T>` from `lib/types.ts`.
- Seed lives in `lib/data/seed.ts` (relative imports only, deterministic).

## Pitfalls

- Route `params` are Promises: `const { id } = await params`.
- `@/lib/data` resolves to `lib/data.ts` (the barrel), not `lib/data/`.
- `contracts` and `cre` are excluded from `tsconfig.json`.
- `contracts/src/App.sol` is unused.
- Keep `evaluateCondition`, the `met` check in `cre/decreta-docket/main.ts` and `DecretaEscrow.sol` in agreement.
- Keep docket ids 68519034 and 69102877 in sync across `lib/data/seed.ts`, the "Try" buttons in `components/escrow-console.tsx`, `cre/decreta-docket/config.staging.json` and `contracts/script/Smoke.s.sol`.

## Never touch

- `.env.local`
- `cre/**/node_modules`
- `contracts/out`

## Vercel guardrails

- No `writeFile` or `fs.` in `app/`, `components/` or `lib/` (build scripts in `scripts/` may write).
- Every `useSearchParams` sits under `<Suspense>`.
- No `output: "export"` and no custom server.
- Every `process.env.X` has an `X=` line in `.env.example`.
- No real network calls in fake mode.

## UI rules

- Build from `components/ui/*`, `cn()` and token classes. No raw hex in components; tokens live only in `app/globals.css`.
- Fraunces on every h1 and h2, sharp radius, rise motion only (`decreta-` keyframes).
- One brand mark: `/logo.svg` inside the brand link in `app/layout.tsx`.

## Copy rules

- No em dashes, no en dashes, no ` -- ` as punctuation.
- Banned words: seamless, seamlessly, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless, "in today's world", "it's not just X, it's Y".

When compacting preserve the list of modified files and test commands.
