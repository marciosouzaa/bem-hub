type ErrorDetails = {
  name: string;
  message: string;
  code?: string;
};

export function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncate(error.message),
      ...readErrorCode(error),
    };
  }

  if (isErrorLike(error)) {
    return {
      name: "ExternalError",
      message: truncate(error.message),
      ...(typeof error.code === "string" ? { code: error.code } : {}),
    };
  }

  return {
    name: "UnknownError",
    message: "Erro nao serializavel.",
  };
}

export function logServerError(
  event: string,
  error: unknown,
  context: Record<string, string | number | boolean | null> = {},
) {
  console.error({
    level: "error",
    event,
    timestamp: new Date().toISOString(),
    ...context,
    error: getErrorDetails(error),
  });
}

function isErrorLike(error: unknown): error is { message: string; code?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function readErrorCode(error: Error) {
  const code = "code" in error ? error.code : undefined;
  return typeof code === "string" ? { code } : {};
}

function truncate(value: string) {
  return value.slice(0, 500);
}
