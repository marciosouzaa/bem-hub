export class ChannelProviderRequestError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ChannelProviderRequestError";
    this.status = status;
  }
}

export async function fetchProviderJson(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
) {
  let response: Response;

  try {
    response = await fetcher(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ChannelProviderRequestError(
      "O provedor não respondeu dentro do tempo esperado.",
    );
  }

  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  throw new ChannelProviderRequestError(
    `O provedor recusou a operação (HTTP ${response.status}).`,
    response.status,
  );
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
