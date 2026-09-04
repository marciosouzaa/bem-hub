"use client";

import { Inbox } from "lucide-react";
import type { SupportInboxItem as SupportInboxItemData } from "@/features/support/queries";
import { SupportInboxItem } from "@/features/support/support-inbox-item";

export function SupportInboxList({ conversations, pathname, viewerId }: { conversations: SupportInboxItemData[]; pathname: string; viewerId: string }) {
  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{conversations.length ? conversations.map((item) => <SupportInboxItem active={pathname === `/app/support/${item.id}`} item={item} key={item.id} viewerId={viewerId} />) : <div className="px-6 py-14 text-center"><span className="mx-auto flex size-11 items-center justify-center rounded-xl border border-panel-border bg-panel text-muted"><Inbox className="size-5" /></span><p className="mt-4 text-sm font-medium text-foreground">Nenhum atendimento encontrado</p><p className="mt-2 text-xs leading-5 text-muted">Ajuste a busca ou escolha outra visualização da fila.</p></div>}</div>;
}
