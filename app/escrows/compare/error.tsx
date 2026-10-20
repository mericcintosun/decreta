"use client";

import Link from "next/link";
import { ErrorState } from "@/components/state-triad";

// Never prints error.message: it can carry upstream details that do not belong on screen.
export default function CompareErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-5xl space-y-6 px-4 py-14 sm:py-20">
        <Link
          href="/escrows"
          className="decreta-label inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to the escrow desk
        </Link>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">The side by side view could not be read</h1>
        <ErrorState
          title="One of the escrows or its docket did not load"
          hint="Funds on chain are not affected by this page. Try the comparison again in a moment."
          onRetry={() => reset()}
          retryLabel="Try again"
        />
      </div>
    </div>
  );
}
