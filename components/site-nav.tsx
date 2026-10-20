"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works", match: null },
  { href: "/escrows", label: "Escrow desk", match: "/escrows" },
  { href: "/escrows/1", label: "Record No. 1", match: "/escrows/1" },
  { href: "/escrows/compare", label: "Side by side", match: "/escrows/compare" },
] as const;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Primary" className="text-sm">
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center border border-border px-3 font-semibold md:hidden",
          focusRing
        )}
        aria-expanded={open}
        aria-controls="primary-menu"
        onClick={() => setOpen((v) => !v)}
      >
        Menu
      </button>

      <ul className="hidden items-center gap-x-6 md:flex">
        {LINKS.map((link) => {
          const active = link.match !== null && pathname === link.match;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center underline-offset-4 hover:underline",
                  focusRing,
                  active && "underline decoration-primary decoration-2"
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {open && (
        <ul
          id="primary-menu"
          className="absolute inset-x-0 top-full border-b border-border bg-background px-4 md:hidden"
        >
          {LINKS.map((link) => {
            const active = link.match !== null && pathname === link.match;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block min-h-11 border-b border-border bg-background py-3",
                    focusRing,
                    active && "font-semibold text-primary"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
