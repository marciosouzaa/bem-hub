import { ShieldCheck, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrganizationMemberItem } from "./queries";
import { removeMemberAction, updateMemberRoleAction } from "./actions";

export function MemberList({ canManage, members }: { canManage: boolean; members: OrganizationMemberItem[] }) {
  return <div className="mt-5 space-y-2">
    {members.map((member) => <div className="grid gap-3 rounded-[var(--radius-control)] border border-panel-border bg-panel-elevated p-3 md:grid-cols-[1fr_auto] md:items-center" key={member.userId}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-primary">{member.isOwner ? <ShieldCheck className="size-4" /> : <Users className="size-4" />}</span>
        <div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-xs text-muted">{member.email} · {member.status === "active" ? "Ativo" : "Removido"}</p></div>
      </div>
      {member.isOwner ? <span className="text-xs font-medium text-primary">Owner protegido</span> : canManage ? <div className="flex flex-wrap gap-2">
        <form action={updateMemberRoleAction.bind(null, member.userId)} className="flex gap-2"><select className="h-9 rounded-md border border-panel-border bg-panel px-2 text-xs" defaultValue={member.role === "admin" ? "admin" : "member"} name="role"><option value="member">Membro</option><option value="admin">Admin</option></select><Button size="sm" type="submit" variant="secondary">Salvar</Button></form>
        {member.status === "active" ? <form action={removeMemberAction.bind(null, member.userId)}><Button aria-label={`Remover ${member.name}`} size="sm" type="submit" variant="danger"><UserMinus className="size-4" />Remover</Button></form> : null}
      </div> : null}
    </div>)}
  </div>;
}
