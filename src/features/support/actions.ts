"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ConnectionState = { ok: boolean; message: string | null };
const schema=z.object({ name:z.string().trim().min(2).max(100), phone:z.string().trim().min(10).max(24), kind:z.enum(["official","unofficial"]) });
export async function registerConnectionAction(_state: ConnectionState, formData: FormData): Promise<ConnectionState> {
 const parsed=schema.safeParse({name:formData.get("name"),phone:formData.get("phone"),kind:formData.get("kind")});
 if(!parsed.success)return{ok:false,message:"Informe nome, numero e modalidade validos."};
 const workspace=await getRequiredWorkspace(); const supabase=await createSupabaseServerClient();
 const {error}=await supabase.rpc("register_channel_connection",{target_organization_id:workspace.organization.id,connection_kind:parsed.data.kind,connection_name:parsed.data.name,connection_phone:parsed.data.phone});
 if(error)return{ok:false,message:error.code==="23505"?"Este numero ja esta cadastrado.":"Nao foi possivel registrar a conexao."};
 revalidatePath("/app/support"); return{ok:true,message:"Numero registrado. Fornecedor pendente."};
}
