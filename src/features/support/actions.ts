"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ConnectionState = { ok: boolean; message: string | null };
const schema=z.object({ name:z.string().trim().min(2).max(100), phone:z.string().trim().min(10).max(24), kind:z.enum(["official","unofficial"]),authMethod:z.enum(["qr","pin"]) });
export async function registerConnectionAction(_state: ConnectionState, formData: FormData): Promise<ConnectionState> {
 const parsed=schema.safeParse({name:formData.get("name"),phone:formData.get("phone"),kind:formData.get("kind"),authMethod:formData.get("authMethod")});
 if(!parsed.success)return{ok:false,message:"Informe nome, numero e modalidade validos."};
 const workspace=await getRequiredWorkspace(); const supabase=await createSupabaseServerClient();
 const {error}=await supabase.rpc("register_channel_connection",{target_organization_id:workspace.organization.id,connection_kind:parsed.data.kind,connection_name:parsed.data.name,connection_phone:parsed.data.phone,connection_auth_method:parsed.data.authMethod});
 if(error)return{ok:false,message:error.code==="23505"?"Este numero ja esta cadastrado.":"Nao foi possivel registrar a conexao."};
 revalidatePath("/app/support"); return{ok:true,message:"Numero registrado. Fornecedor pendente."};
}
export async function deleteConnectionAction(connectionId:string){const workspace=await getRequiredWorkspace();const supabase=await createSupabaseServerClient();const{error}=await supabase.rpc("delete_channel_connection",{target_organization_id:workspace.organization.id,target_connection_id:connectionId});if(error)throw new Error(`Falha ao excluir canal: ${error.message}`);revalidatePath("/app/channels")}
export async function updateConnectionAction(connectionId:string,formData:FormData){const parsed=z.object({name:z.string().trim().min(2),phone:z.string().trim().min(10),authMethod:z.enum(["qr","pin"])}).safeParse({name:formData.get("name"),phone:formData.get("phone"),authMethod:formData.get("authMethod")});if(!parsed.success)throw new Error("Configuracao de canal invalida.");const workspace=await getRequiredWorkspace();const supabase=await createSupabaseServerClient();const{error}=await supabase.rpc("update_channel_connection",{target_organization_id:workspace.organization.id,target_connection_id:connectionId,connection_name:parsed.data.name,connection_phone:parsed.data.phone,connection_auth_method:parsed.data.authMethod});if(error)throw new Error(`Falha ao editar canal: ${error.message}`);revalidatePath("/app/channels")}

export async function createDraftAction(conversationId:string,formData:FormData){const content=z.string().trim().min(1).max(10000).safeParse(formData.get("content"));if(!content.success)throw new Error("Rascunho invalido.");const workspace=await getRequiredWorkspace();const supabase=await createSupabaseServerClient();const{error}=await supabase.rpc("create_support_draft",{target_organization_id:workspace.organization.id,target_conversation_id:conversationId,draft_content:content.data});if(error)throw new Error(`Falha ao criar rascunho: ${error.message}`);revalidatePath(`/app/support/${conversationId}`)}
export async function reviewDraftAction(conversationId:string,messageId:string,decision:"approved"|"rejected"|"escalated"){const workspace=await getRequiredWorkspace();const supabase=await createSupabaseServerClient();const{error}=await supabase.rpc("review_support_draft",{target_organization_id:workspace.organization.id,target_message_id:messageId,review_decision:decision});if(error)throw new Error(`Falha ao revisar rascunho: ${error.message}`);revalidatePath(`/app/support/${conversationId}`);revalidatePath("/app/support")}
