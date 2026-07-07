export const KNOWLEDGE_BUCKET = "knowledge-documents";
export const MAX_DOCUMENT_SIZE_BYTES = 6 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
  "text/x-markdown",
] as const;
