// Build-time script: writes fixtures/seed.json from lib/data/seed.ts.
// Deterministic, so two runs give byte-identical output. Run with `npm run seed`.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { dockets, escrows } from "../lib/data/seed";

const out = resolve(process.cwd(), "fixtures/seed.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ dockets, escrows }, null, 2)}\n`);
console.log(`seed: wrote ${dockets.length} dockets and ${escrows.length} escrows to fixtures/seed.json`);
