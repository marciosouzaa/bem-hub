import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const itemSchema = z.object({
  id: z.string().uuid(), status: z.enum(["open", "pending", "resolved", "escalated"]), priority: z.enum(["low", "normal", "high", "urgent"]),
  lastMessageAt: z.string(), assignedTo: z.string().uuid().nullable(),
  contact: z.object({ id: z.string().uuid(), name: z.string().nullable(), phone: z.string().nullable(), email: z.string().nullable(), tags: z.array(z.string()) }),
  channel: z.object({ id: z.string().uuid(), kind: z.enum(["official", "unofficial"]), provider: z.string(), name: z.string(), phoneNumber: z.string() }),
});

export async function listSupportInbox(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_support_inbox", { target_organization_id: organizationId });
  if (error) throw new Error(`Falha ao carregar atendimentos: ${error.message}`);
  return z.array(itemSchema).parse(data);
}

const connectionSchema=z.object({id:z.string().uuid(),kind:z.enum(["official","unofficial"]),provider:z.string(),name:z.string(),phoneNumber:z.string(),status:z.string(),authMethod:z.enum(["qr","pin"])});
export async function listChannelConnections(organizationId:string){const supabase=await createSupabaseServerClient();const{data,error}=await supabase.rpc("list_channel_connections",{target_organization_id:organizationId});if(error)throw new Error(`Falha ao listar canais: ${error.message}`);return z.array(connectionSchema).parse(data)}

const conversationSchema=z.object({id:z.string().uuid(),status:z.string(),priority:z.string(),contact:z.object({id:z.string().uuid(),name:z.string().nullable(),phone:z.string().nullable(),email:z.string().nullable()}),channel:z.object({id:z.string().uuid(),name:z.string(),phoneNumber:z.string(),kind:z.string()}),messages:z.array(z.object({id:z.string().uuid(),direction:z.enum(["inbound","outbound"]),content:z.string(),status:z.string(),createdAt:z.string()}))});
export async function getSupportConversation(organizationId:string,conversationId:string){const supabase=await createSupabaseServerClient();const{data,error}=await supabase.rpc("get_support_conversation",{target_organization_id:organizationId,target_conversation_id:conversationId});if(error)throw new Error(`Falha ao abrir atendimento: ${error.message}`);return conversationSchema.parse(data)}
