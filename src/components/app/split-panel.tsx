import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SplitPanelProps = HTMLAttributes<HTMLDivElement> & {
  sidebar?: "left" | "right";
  sidebarWidth?: "sm" | "md" | "lg";
};

const splitPanelColumns = {
  left: {
    sm: "lg:grid-cols-[240px_minmax(0,1fr)]",
    md: "lg:grid-cols-[282px_minmax(0,1fr)]",
    lg: "lg:grid-cols-[320px_minmax(0,1fr)]",
  },
  right: {
    sm: "lg:grid-cols-[minmax(0,1fr)_240px]",
    md: "lg:grid-cols-[minmax(0,1fr)_282px]",
    lg: "lg:grid-cols-[minmax(0,1fr)_320px]",
  },
};

export function SplitPanel({
  className,
  sidebar = "right",
  sidebarWidth = "md",
  ...props
}: SplitPanelProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-6 md:gap-8",
        splitPanelColumns[sidebar][sidebarWidth],
        className,
      )}
      {...props}
    />
  );
}
