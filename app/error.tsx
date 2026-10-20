"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Never prints error.message: it can carry upstream details that do not belong on screen.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-3xl space-y-6 px-4 py-24">
        <p className="decreta-label text-primary">Clerk&apos;s note</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Decreta hit an error on this page</h1>
        <p className="max-w-prose text-muted-foreground">
          Nothing was sent and no funds moved. Try the page again, or go back to the escrow desk.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/escrows">Go to the escrow desk</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
