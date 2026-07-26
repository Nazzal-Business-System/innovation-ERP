import { cn } from "@/lib/utils";

interface ModuleLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClass = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-[1600px]",
  full: "max-w-none",
};

export function ModuleLayout({ children, className, maxWidth = "2xl" }: ModuleLayoutProps) {
  return (
    <div className={cn("ierp-page-stack mx-auto w-full", maxWidthClass[maxWidth], className)}>
      {children}
    </div>
  );
}
