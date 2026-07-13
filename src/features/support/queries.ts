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
