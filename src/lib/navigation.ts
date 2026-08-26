export function sanitizeInternalPath(
  next: string | null | undefined,
  fallback = "/app",
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export function getLoginPath(next: string) {
  return `/auth/login?next=${encodeURIComponent(next)}`;
}
