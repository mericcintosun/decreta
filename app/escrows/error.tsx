"use client";

import { ErrorState } from "@/components/state-triad";

// Never prints error.message: it can carry upstream details that do not belong on screen.
export default function EscrowDeskErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-3xl space-y-6 px-4 py-14 sm:py-20">
        <p className="decreta-label text-primary">Escrow desk</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">The desk could not open</h1>
        <ErrorState
          title="The register or a docket read failed"
          hint="Nothing was sent and no funds moved. Try the desk again in a moment."
          onRetry={() => reset()}
          retryLabel="Try again"
        />
      </div>
    </div>
  );
}
