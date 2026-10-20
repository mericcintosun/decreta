"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works", match: null },
  { href: "/escrows", label: "Escrow desk", match: "/escrows" },
  { href: "/escrows/1", label: "Record No. 1", match: "/escrows/1" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm">
      {LINKS.map((link) => {
        const active = link.match !== null && pathname === link.match;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active && "underline decoration-primary decoration-2"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
