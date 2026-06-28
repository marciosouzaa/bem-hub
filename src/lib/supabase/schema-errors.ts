type SupabaseSchemaError = {
  code?: string;
  message?: string;
};

export function isMissingColumnError(
  error: SupabaseSchemaError,
  columnNames: string[],
) {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42703" ||
    columnNames.some((columnName) =>
      message.includes(columnName.toLowerCase()),
    )
  );
}

export function isMissingRelationError(
  error: SupabaseSchemaError,
  relationName: string,
) {
  const message = error.message?.toLowerCase() ?? "";
  const normalizedRelation = relationName.toLowerCase();

  return (
    error.code === "42P01" ||
    (message.includes(normalizedRelation) &&
      (message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("could not find")))
  );
}
