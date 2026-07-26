import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ierp-skeleton-shimmer rounded-md", className)}
      {...props}
    />
  );
}
