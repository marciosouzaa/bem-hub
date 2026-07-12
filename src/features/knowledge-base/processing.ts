import { ACCEPTED_DOCUMENT_MIME_TYPES } from "./constants";

const CHUNK_MAX_CHARACTERS = 1800;
const CHUNK_OVERLAP_CHARACTERS = 220;

export type DocumentChunkInput = {
  content: string;
  chunkIndex: number;
  tokenCount: number;
};

export async function extractDocumentText(file: File) {
  if (isPlainTextDocument(file)) {
    return normalizeExtractedText(await file.text());
  }

  if (file.type === "application/pdf") {
    return extractPdfText(file);
  }

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxText(file);
  }

  throw new Error("Tipo de arquivo nao suportado.");
}

export function chunkDocumentText(text: string): DocumentChunkInput[] {
  const normalized = normalizeExtractedText(text);

  if (!normalized) {
    return [];
  }

  const chunks: DocumentChunkInput[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + CHUNK_MAX_CHARACTERS, normalized.length);
    const end = findChunkBoundary(normalized, start, hardEnd);
    const content = normalized.slice(start, end).trim();

    if (content) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
        tokenCount: estimateTokenCount(content),
      });
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP_CHARACTERS, start + 1);
  }

  return chunks;
}

export function isAcceptedDocument(file: File) {
  return (
    ACCEPTED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number],
    ) || isMarkdownFilename(file.name)
  );
}

export function isPlainTextDocument(file: File) {
  return (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.type === "text/x-markdown" ||
    isMarkdownFilename(file.name)
  );
}

export function sanitizeStorageFilename(filename: string) {
  const extension = filename.includes(".") ? filename.split(".").pop() : null;
  const name = filename
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const safeName = name || "documento";
  const safeExtension = extension
    ? extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)
    : "txt";

  return `${safeName}.${safeExtension}`;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function extractPdfText(file: File) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const result = await parser.getText({ pageJoiner: "\n\n" });
    const text = normalizeExtractedText(result.text);

    if (!text) {
      throw new Error("PDF sem texto extraivel. OCR ainda nao suportado.");
    }

    return text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(file: File) {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(await file.arrayBuffer()),
  });
  const text = normalizeExtractedText(result.value);

  if (!text) {
    throw new Error("DOCX sem texto extraivel.");
  }

  return text;
}

function findChunkBoundary(text: string, start: number, hardEnd: number) {
  if (hardEnd >= text.length) {
    return hardEnd;
  }

  const slice = text.slice(start, hardEnd);
  const paragraphBreak = slice.lastIndexOf("\n\n");

  if (paragraphBreak > CHUNK_MAX_CHARACTERS * 0.55) {
    return start + paragraphBreak;
  }

  const sentenceBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
  );

  if (sentenceBreak > CHUNK_MAX_CHARACTERS * 0.55) {
    return start + sentenceBreak + 1;
  }

  const wordBreak = slice.lastIndexOf(" ");

  if (wordBreak > CHUNK_MAX_CHARACTERS * 0.55) {
    return start + wordBreak;
  }

  return hardEnd;
}

function estimateTokenCount(content: string) {
  return Math.ceil(content.length / 4);
}

function isMarkdownFilename(filename: string) {
  return /\.(md|markdown)$/i.test(filename);
}
