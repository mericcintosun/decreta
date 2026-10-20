import { existsSync } from "node:fs";
import { join } from "node:path";

export type SceneNumber = 1 | 2 | 3 | 4 | 5;

// Scene rasters are dropped into public/brand later; until then every slot falls back to its SVG.
export function sceneSrc(n: SceneNumber): string | null {
  try {
    return existsSync(join(process.cwd(), "public", "brand", `scene-${n}.png`)) ? `/brand/scene-${n}.png` : null;
  } catch {
    return null;
  }
}
