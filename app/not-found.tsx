import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="decreta-ruled">
      <div className="decreta-rise mx-auto max-w-3xl space-y-6 px-4 py-24">
        <p className="decreta-label text-primary">Decreta</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">No escrow or page at this address</h1>
        <p className="max-w-prose text-muted-foreground">
          The link may be mistyped, or the escrow was created in another browser.
        </p>
        <Button asChild variant="outline">
          <Link href="/escrows">Go to the escrow desk</Link>
        </Button>
      </div>
    </div>
  );
}
