import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { PageHeader, PageLayout } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createDraftAction, reviewDraftAction } from "@/features/support/actions";
import { getSupportConversation } from "@/features/support/queries";

export default async function SupportConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const workspace = await getRequiredWorkspace();
  const { conversationId } = await params;
  const conversation = await getSupportConversation(workspace.organization.id, conversationId);
  const createDraft = createDraftAction.bind(null, conversationId);

  return <PageLayout className="space-y-6">
    <Button asChild size="sm" variant="ghost"><Link href="/app/support"><ArrowLeft className="size-4" />Voltar</Link></Button>
    <PageHeader eyebrow={`${conversation.channel.name} · ${conversation.channel.phoneNumber}`} title={conversation.contact.name ?? conversation.contact.phone ?? "Contato"} description={`Atendimento ${conversation.status}. Aprovar prepara a resposta; envio externo aguarda o fornecedor.`} />
    <Card><CardContent className="space-y-4 p-5 md:pt-5">
      {conversation.messages.length ? conversation.messages.map((message) => <div className={message.direction === "outbound" ? "ml-auto max-w-[80%] rounded-xl bg-sidebar-active p-4" : "max-w-[80%] rounded-xl border border-panel-border bg-panel-elevated p-4"} key={message.id}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
        <p className="mt-2 text-xs text-muted">{message.direction === "inbound" ? "Contato" : "Equipe"} · {message.status}</p>
        {message.status === "draft" ? <div className="mt-3 flex flex-wrap gap-2">
          <form action={reviewDraftAction.bind(null, conversationId, message.id, "approved")}><Button size="sm" type="submit">Aprovar</Button></form>
          <form action={reviewDraftAction.bind(null, conversationId, message.id, "rejected")}><Button size="sm" type="submit" variant="outline">Rejeitar</Button></form>
          <form action={reviewDraftAction.bind(null, conversationId, message.id, "escalated")}><Button size="sm" type="submit" variant="ghost">Escalar</Button></form>
        </div> : null}
      </div>) : <div className="py-12 text-center"><UserRound className="mx-auto size-7 text-muted" /><p className="mt-3 text-sm text-muted-strong">Nenhuma mensagem neste atendimento.</p></div>}
    </CardContent></Card>
    {conversation.status !== "resolved" ? <Card><CardContent className="p-5 md:pt-5"><form action={createDraft} className="space-y-3">
      <label className="text-sm font-medium" htmlFor="support-draft">Novo rascunho</label>
      <textarea className="min-h-28 w-full rounded-lg border border-panel-border bg-panel-elevated p-3 text-sm outline-none focus:border-primary" id="support-draft" maxLength={10000} name="content" placeholder="Prepare uma resposta para revisao humana..." required />
      <div className="flex items-center justify-between gap-4"><p className="text-xs text-muted">Nenhuma mensagem sera enviada nesta etapa.</p><Button type="submit">Criar rascunho</Button></div>
    </form></CardContent></Card> : null}
  </PageLayout>;
}
