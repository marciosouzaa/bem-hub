import { z } from "zod";

import { tagSchema } from "@/features/tags/tag-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listTags(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_tags", {
    target_organization_id: organizationId,
  });

  if (error) throw new Error(`Falha ao listar etiquetas: ${error.message}`);
  return z.array(tagSchema).parse(data);
}
