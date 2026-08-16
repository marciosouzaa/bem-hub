"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

import { cn } from "@/lib/utils";

export function SupportContactAvatar({
  active = false,
  avatarUrl,
  className,
  initials,
}: {
  active?: boolean;
  avatarUrl: string | null;
  className?: string;
  initials: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = avatarUrl && !failed;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border font-bold",
        active
          ? "border-primary/25 bg-primary/15 text-primary"
          : "border-panel-border bg-panel-elevated text-muted-strong",
        className,
      )}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        initials
      )}
    </span>
  );
}
