import Image from "next/image";
import { sceneSrc, type SceneNumber } from "@/lib/brand";
import { cn } from "@/lib/utils";

type SceneSlotProps = {
  n: SceneNumber;
  alt: string;
  width: number;
  height: number;
  fallback: `/illustrations/${string}.svg`;
  className?: string;
};

// Server component: shows public/brand/scene-N.png when it exists, otherwise the fieldbook SVG.
export function SceneSlot({ n, alt, width, height, fallback, className }: SceneSlotProps) {
  const src = sceneSrc(n) ?? fallback;
  return (
    <div className={cn("border border-border bg-secondary", className)}>
      <Image src={src} alt={alt} width={width} height={height} unoptimized className="block h-auto w-full" />
    </div>
  );
}
