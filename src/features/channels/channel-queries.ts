import { z } from "zod";

import { channelConnectionSchema } from "@/features/channels/channel-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listChannelConnections(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_channel_connections", {
    target_organization_id: organizationId,
  });

  if (error) throw new Error(`Falha ao listar canais: ${error.message}`);
  return z.array(channelConnectionSchema).parse(data);
}
