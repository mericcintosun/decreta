"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DURATION_MS = 900;

// Server HTML carries the final value. On first view the number counts up from zero, unless motion is reduced.
export function DeskCount({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const final = value.toFixed(decimals);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(final);

  useEffect(() => {
    const node = ref.current;
    if (!node || !Number.isFinite(value) || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / DURATION_MS);
          if (progress < 1) {
            const eased = 1 - Math.pow(1 - progress, 3);
            setShown((value * eased).toFixed(decimals));
            frame = requestAnimationFrame(tick);
          } else {
            setShown(final);
          }
        };
        setShown((0).toFixed(decimals));
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, decimals, final]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {shown}
    </span>
  );
}
