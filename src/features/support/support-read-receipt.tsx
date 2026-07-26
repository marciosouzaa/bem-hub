"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { markSupportConversationReadAction } from "@/features/support/support-actions";

export function SupportReadReceipt({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const markedConversation = useRef<string | null>(null);

  useEffect(() => {
    if (markedConversation.current === conversationId) return;

    markedConversation.current = conversationId;
    void markSupportConversationReadAction(conversationId).then((result) => {
      if (result.ok) {
        router.refresh();
        return;
      }

      markedConversation.current = null;
    });
  }, [conversationId, router]);

  return null;
}
