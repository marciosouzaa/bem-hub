import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "aria-label" | "size"> & {
  label: string;
  size?: "sm" | "md";
};

export function IconButton({ label, size = "md", title, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      size="icon"
      title={title ?? label}
      {...props}
      className={cn(size === "sm" && "size-8", props.className)}
    />
  );
}
