import { z } from "zod";

import {
  ChannelProviderRequestError,
  fetchProviderJson,
} from "@/features/channels/providers/provider-http";

const managedUserSchema = z.object({
  id: z.string().trim().min(1),
  jid: z.string().nullish(),
  name: z.string(),
  token: z.string().trim().min(1),
});

const createdUserResponseSchema = z.object({
  data: managedUserSchema,
  success: z.literal(true),
});

const usersResponseSchema = z.object({
  data: z.array(managedUserSchema),
  success: z.literal(true),
});

export type ManagedWuzapiProvisionInput = {
  hmacKey: string;
  instanceName: string;
  token: string;
  webhookUrl: string;
};

export type ManagedWuzapiProvisionResult = {
  externalInstanceId: string;
  reconciled: boolean;
};

export function createManagedWuzapiProvisioner(
  input: {
    adminToken: string;
    baseUrl: string;
  },
  fetcher: typeof fetch = fetch,
) {
  const headers = {
    Authorization: input.adminToken,
    "Content-Type": "application/json",
  };

  return {
    async getPhoneNumber(input: {
      externalInstanceId: string | null;
      token: string;
    }) {
      const user = await findUser(input);
      return getPhoneFromJid(user?.jid);
    },
    async provision(
      provisioning: ManagedWuzapiProvisionInput,
    ): Promise<ManagedWuzapiProvisionResult> {
      try {
        const payload = await fetchProviderJson(
          fetcher,
          `${input.baseUrl}/admin/users`,
          {
            body: JSON.stringify({
              events: "Message,ReadReceipt",
              hmacKey: provisioning.hmacKey,
              name: provisioning.instanceName,
              token: provisioning.token,
              webhook: provisioning.webhookUrl,
            }),
            headers,
            method: "POST",
          },
        );
        return {
          externalInstanceId: createdUserResponseSchema.parse(payload).data.id,
          reconciled: false,
        };
      } catch (error) {
        if (
          !(error instanceof ChannelProviderRequestError)
          || error.status !== 409
        ) {
          throw error;
        }

        const existing = await findByToken(provisioning.token);
        if (!existing) throw error;
        return {
          externalInstanceId: existing.id,
          reconciled: true,
        };
      }
    },
  };

  async function findByToken(token: string) {
    return findUser({ externalInstanceId: null, token });
  }

  async function findUser(lookup: {
    externalInstanceId: string | null;
    token: string;
  }) {
    const payload = await fetchProviderJson(
      fetcher,
      `${input.baseUrl}/admin/users`,
      { headers, method: "GET" },
    );
    return usersResponseSchema.parse(payload).data.find((user) =>
      (
        lookup.externalInstanceId !== null
        && user.id === lookup.externalInstanceId
      )
      || user.token === lookup.token
    );
  }
}

export function createManagedWuzapiInstanceName(
  organizationId: string,
  channelId: string,
) {
  return `bemhub-${organizationId.slice(0, 8)}-${channelId.slice(0, 8)}`;
}

function getPhoneFromJid(jid: string | null | undefined) {
  if (!jid) return null;
  const phone = jid.split("@", 1)[0].split(":", 1)[0].replace(/\D/g, "");
  return phone.length >= 10 && phone.length <= 15 ? phone : null;
}
