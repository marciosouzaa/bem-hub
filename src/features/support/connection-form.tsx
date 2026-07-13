"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { registerConnectionAction, type ConnectionState } from "./actions";
const initial:ConnectionState={ok:false,message:null};
export function ConnectionForm({canManage}:{canManage:boolean}){const[state,action]=useActionState(registerConnectionAction,initial);return <form action={action} className="space-y-3"><input className="h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm" disabled={!canManage} name="name" placeholder="WhatsApp comercial" required/><input className="h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm" disabled={!canManage} name="phone" placeholder="+55 11 99999-9999" required/><select className="h-10 w-full rounded-md border border-panel-border bg-panel-elevated px-3 text-sm" disabled={!canManage} name="kind"><option value="official">API oficial</option><option value="unofficial">API nao oficial</option></select>{state.message?<p className={state.ok?"text-xs text-primary":"text-xs text-danger"}>{state.message}</p>:null}<Submit disabled={!canManage}/></form>}
function Submit({disabled}:{disabled:boolean}){const{pending}=useFormStatus();return <Button className="w-full" disabled={disabled||pending} type="submit">{pending?"Registrando...":"Registrar numero"}</Button>}
