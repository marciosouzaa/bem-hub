import "server-only";

import { z } from "zod";

import { channelProviderCredentialsSchema } from "@/features/channels/channel-provider-schema";
import type { ChannelProviderAdapter } from "@/features/channels/providers/channel-provider-adapter";
import { resolveChannelProvider } from "@/features/channels/providers/resolve-channel-provider";
import { decryptSecret } from "@/lib/security/encryption";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

const contactAvatarCandidateSchema = z.object({
  avatar_fetched_at: z.string().nullable(),
  avatar_url: z.string().nullable(),
  phone: z.string().nullable(),
});

const messageContactSchema = z.object({
  contact_id: z.string().uuid(),
});

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function syncSupportContactAvatarForChannelContact(input: {
  admin: SupabaseAdminClient;
  channelConnectionId: string;
  contactId: string;
  organizationId: string;
}) {
  try {
    const contact = await loadContactAvatarCandidate(
      input.admin,
      input.organizationId,
      input.contactId,
    );
    if (!contact || shouldSkipAvatarFetch(contact)) return;

    const { data: stored, error } = await input.admin
      .from("channel_credentials")
      .select("encrypted_credentials,provider")
      .eq("channel_connection_id", input.channelConnectionId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();
    if (error || !stored) return;

    const credentials = channelProviderCredentialsSchema.parse(
      JSON.parse(decryptSecret(stored.encrypted_credentials)),
    );
    const adapter = resolveChannelProvider(credentials);
    await syncSupportContactAvatar({
      admin: input.admin,
      adapter,
      contactId: input.contactId,
      organizationId: input.organizationId,
      phone: contact.phone,
    });
  } catch {
    return;
  }
}

export async function syncSupportContactAvatarForInboundMessage(input: {
  admin: SupabaseAdminClient;
  adapter: ChannelProviderAdapter;
  messageId: string;
  organizationId: string;
  phone: string | null;
}) {
  try {
    if (!input.phone) return;
    const { data, error } = await input.admin
      .from("support_messages")
      .select("conversation_id")
      .eq("id", input.messageId)
      .eq("organization_id", input.organizationId)
      .maybeSingle();
    if (error || !data) return;

    const { data: conversation, error: conversationError } = await input.admin
      .from("support_conversations")
      .select("contact_id")
      .eq("id", data.conversation_id)
      .eq("organization_id", input.organizationId)
      .maybeSingle();
    if (conversationError || !conversation) return;

    const parsed = messageContactSchema.parse(conversation);
    await syncSupportContactAvatar({
      admin: input.admin,
      adapter: input.adapter,
      contactId: parsed.contact_id,
      organizationId: input.organizationId,
      phone: input.phone,
    });
  } catch {
    return;
  }
}

async function syncSupportContactAvatar(input: {
  admin: SupabaseAdminClient;
  adapter: ChannelProviderAdapter;
  contactId: string;
  organizationId: string;
  phone: string | null;
}) {
  if (!input.phone || !input.adapter.getContactProfilePicture) return;

  const contact = await loadContactAvatarCandidate(
    input.admin,
    input.organizationId,
    input.contactId,
  );
  if (!contact || shouldSkipAvatarFetch(contact)) return;

  const profile = await input.adapter.getContactProfilePicture({
    phone: input.phone,
  }).catch(() => null);
  if (!profile) return;

  await input.admin
    .from("contacts")
    .update({
      avatar_fetched_at: new Date().toISOString(),
      avatar_url: profile.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contactId)
    .eq("organization_id", input.organizationId);
}

async function loadContactAvatarCandidate(
  admin: SupabaseAdminClient,
  organizationId: string,
  contactId: string,
) {
  const { data, error } = await admin
    .from("contacts")
    .select("avatar_fetched_at,avatar_url,phone")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) return null;
  return contactAvatarCandidateSchema.parse(data);
}

function shouldSkipAvatarFetch(
  contact: z.infer<typeof contactAvatarCandidateSchema>,
) {
  if (contact.avatar_url) return true;
  if (!contact.avatar_fetched_at) return false;

  const fetchedAt = new Date(contact.avatar_fetched_at).getTime();
  if (!Number.isFinite(fetchedAt)) return false;
  const retryWhenMissingMs = 15 * 60 * 1000;
  return Date.now() - fetchedAt < retryWhenMissingMs;
}
