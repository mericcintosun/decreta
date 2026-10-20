import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        locked: "border-ochre bg-background text-foreground",
        released: "border-transparent bg-ok text-primary-foreground",
        refunded: "border-transparent bg-bad text-primary-foreground",
        // Clerk's rubber stamp: double rule in the state color, slightly rotated.
        stamp: "-rotate-[4deg] border-2 border-current bg-transparent px-3 py-1 text-sm tracking-[0.22em] outline outline-1 outline-offset-2 outline-current",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
