import { z } from "zod";

import { contactSchema } from "@/features/contacts/contact-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listContacts(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_contacts", {
    target_organization_id: organizationId,
  });

  if (error) throw new Error(`Falha ao listar contatos: ${error.message}`);
  return z.array(contactSchema).parse(data);
}
