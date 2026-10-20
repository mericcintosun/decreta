"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ErrorCode } from "@/lib/errors";
import { cn } from "@/lib/utils";

// The error and empty legs of the triad (loading lives in each route's loading.tsx).
// Every ErrorState has a retry; every EmptyState has an action.

export function ErrorState({
  title,
  hint,
  onRetry,
  retryLabel = "Try again",
  code,
  className,
}: {
  title: string;
  hint: string;
  onRetry: () => void;
  retryLabel?: string;
  code?: ErrorCode | null;
  className?: string;
}) {
  const soft = code === "not_configured";
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-l-4 bg-secondary p-4 text-sm",
        soft ? "border-ochre" : "border-bad",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {code && <Badge variant={soft ? "locked" : "refunded"}>{code.replaceAll("_", " ")}</Badge>}
          {title}
        </p>
        <p>{hint}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  heading: Heading = "p",
}: {
  title: string;
  body?: ReactNode;
  action: ReactNode;
  /** h1 when the empty state is the whole page, as on a missing record. */
  heading?: "h1" | "h2" | "p";
}) {
  return (
    <Card className="text-center">
      <CardContent className="space-y-4 pt-6">
        <Image
          src="/illustrations/docket-sheet.svg"
          alt="A ruled docket sheet with a rust TERMINATED stamp"
          width={320}
          height={150}
          className="mx-auto opacity-70"
          unoptimized
        />
        <Heading className={cn("font-display font-semibold", Heading === "h1" ? "text-2xl" : "text-lg")}>{title}</Heading>
        {body && <p className="mx-auto max-w-prose text-muted-foreground">{body}</p>}
        <div className="flex flex-wrap justify-center gap-2">{action}</div>
      </CardContent>
    </Card>
  );
}
