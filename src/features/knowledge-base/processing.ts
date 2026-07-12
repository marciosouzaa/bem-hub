import { ACCEPTED_DOCUMENT_MIME_TYPES } from "./constants";

const CHUNK_MAX_CHARACTERS = 1800;
const CHUNK_OVERLAP_CHARACTERS = 220;
const MAX_CATALOG_ROWS = 1_000;
const MAX_CATALOG_COLUMNS = 30;
const MAX_CATALOG_CELL_CHARACTERS = 500;
const PRODUCT_HEADERS = ["produto", "nome", "item", "product", "name"];
const PRICE_HEADERS = ["preco", "valor", "price", "preco venda"];

export type DocumentChunkInput = {
  content: string;
  chunkIndex: number;
  tokenCount: number;
};

export async function extractDocumentText(file: File) {
  if (isCatalogSpreadsheet(file)) {
    return extractCatalogSpreadsheetText(await file.text(), file.name);
  }

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
    ) ||
    isMarkdownFilename(file.name) ||
    isCatalogSpreadsheet(file)
  );
}

export function extractCatalogSpreadsheetText(content: string, filename: string) {
  const delimiter = filename.toLowerCase().endsWith(".tsv") ? "\t" : detectDelimiter(content);
  const rows = parseDelimitedRows(content, delimiter);

  if (rows.length < 2) {
    throw new Error("Catalogo precisa ter cabecalho e ao menos um produto.");
  }

  if (rows.length - 1 > MAX_CATALOG_ROWS) {
    throw new Error(`Catalogo excede o limite de ${MAX_CATALOG_ROWS} produtos.`);
  }

  const headers = rows[0].map(normalizeHeader);
  if (headers.length > MAX_CATALOG_COLUMNS) {
    throw new Error(`Catalogo excede o limite de ${MAX_CATALOG_COLUMNS} colunas.`);
  }

  const productIndex = findHeaderIndex(headers, PRODUCT_HEADERS);
  const priceIndex = findHeaderIndex(headers, PRICE_HEADERS);

  if (productIndex < 0 || priceIndex < 0) {
    throw new Error(
      "Catalogo precisa conter colunas de produto (produto/nome/item) e preco (preco/valor).",
    );
  }

  const normalizedRows = rows.slice(1).flatMap((row, rowIndex) => {
    const product = sanitizeCatalogCell(row[productIndex] ?? "");
    const price = sanitizeCatalogCell(row[priceIndex] ?? "");

    if (!product || !price) {
      return [];
    }

    const details = headers.flatMap((header, columnIndex) => {
      if (!header || columnIndex === productIndex || columnIndex === priceIndex) {
        return [];
      }

      const value = sanitizeCatalogCell(row[columnIndex] ?? "");
      return value ? [`${header}: ${value}`] : [];
    });

    return [
      `Produto ${rowIndex + 1}\nNome: ${product}\nPreco: ${price}${
        details.length ? `\n${details.join("\n")}` : ""
      }`,
    ];
  });

  if (!normalizedRows.length) {
    throw new Error("Catalogo nao possui produtos com nome e preco preenchidos.");
  }

  return `CATALOGO E TABELA DE PRECOS\nArquivo: ${sanitizeStorageFilename(filename)}\nRegistros: ${normalizedRows.length}\n\n${normalizedRows.join("\n\n")}`;
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

function isCatalogSpreadsheet(file: File) {
  return (
    /\.(csv|tsv)$/i.test(file.name) ||
    [
      "text/csv",
      "text/tab-separated-values",
      "application/csv",
      "application/vnd.ms-excel",
    ].includes(file.type)
  );
}

function detectDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  return candidates.reduce((best, candidate) =>
    countDelimiter(firstLine, candidate) > countDelimiter(firstLine, best)
      ? candidate
      : best,
  );
}

function countDelimiter(line: string, delimiter: string) {
  return line.split(delimiter).length - 1;
}

function parseDelimitedRows(content: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error("Catalogo possui campo com aspas nao finalizadas.");
  }

  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function sanitizeCatalogCell(value: string) {
  const normalized = value
    .replace(/\u0000/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CATALOG_CELL_CHARACTERS);

  return /^[=+@]/.test(normalized) || /^-\s*[A-Za-z]/.test(normalized)
    ? "[formula nao executada]"
    : normalized;
}
