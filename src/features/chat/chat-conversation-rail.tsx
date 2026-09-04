"use client";

import { MessageSquareText, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversationListItem } from "@/features/chat/types";
import { cn } from "@/lib/utils";

export function ChatConversationRail({ conversationId, conversations, monthlyLimit, monthlyUsage, remainingMessages, usagePercent }: { conversationId: string | null; conversations: ConversationListItem[]; monthlyLimit: number; monthlyUsage: number; remainingMessages: number; usagePercent: number }) {
  return <aside className="space-y-4"><Button asChild className="w-full" variant="secondary"><Link href="/app/chat"><Plus className="size-4" />Nova conversa</Link></Button><Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.12em]"><MessageSquareText className="size-4 text-primary" />Histórico</CardTitle></CardHeader><CardContent className="space-y-2">{conversations.length ? conversations.map((conversation) => <Link className={cn("block rounded-md border border-panel-border bg-panel-elevated px-3 py-3 text-sm transition hover:border-primary hover:text-primary", conversation.id === conversationId && "border-primary bg-sidebar-active text-primary")} href={`/app/chat?conversationId=${conversation.id}`} key={conversation.id}><span className="line-clamp-2">{conversation.title || "Conversa sem título"}</span><span className="mt-2 block text-xs text-muted">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit" }).format(new Date(conversation.updatedAt))}</span></Link>) : <p className="text-sm leading-6 text-muted-strong">Nenhuma conversa registrada ainda.</p>}</CardContent></Card><Card><CardContent className="p-4"><p className="text-xs uppercase tracking-[0.12em] text-muted">Uso mensal</p><div className="mt-3 flex items-end justify-between gap-3"><p className="font-mono text-2xl text-primary">{monthlyUsage}</p><p className="text-sm text-muted-strong">/ {monthlyLimit}</p></div><div className="mt-3 h-1 rounded-full bg-panel-subtle"><div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} /></div><p className="mt-3 text-xs text-muted">{remainingMessages} respostas restantes no plano atual.</p></CardContent></Card></aside>;
}
