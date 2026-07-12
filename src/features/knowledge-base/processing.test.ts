import { describe, expect, test } from "bun:test";
import JSZip from "jszip";
import {
  extractCatalogSpreadsheetText,
  extractDocumentText,
} from "./processing";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("extractDocumentText DOCX", () => {
  test("extracts paragraphs and normalizes spacing", async () => {
    const file = await createDocx(["Politica de ferias", "Prazo de 43 dias."]);

    await expect(extractDocumentText(file)).resolves.toBe(
      "Politica de ferias\n\nPrazo de 43 dias.",
    );
  });

  test("rejects a DOCX without extractable text", async () => {
    const file = await createDocx([]);

    await expect(extractDocumentText(file)).rejects.toThrow(
      "DOCX sem texto extraivel.",
    );
  });
});

describe("extractCatalogSpreadsheetText", () => {
  test("normalizes a semicolon catalog with quoted values", () => {
    const text = extractCatalogSpreadsheetText(
      'Produto;Preco;Descricao\n"Base Matte";89,90;"Pele oleosa; longa duracao"',
      "catalogo.csv",
    );

    expect(text).toContain("Nome: Base Matte");
    expect(text).toContain("Preco: 89,90");
    expect(text).toContain("descricao: Pele oleosa; longa duracao");
  });

  test("neutralizes spreadsheet formulas", () => {
    const text = extractCatalogSpreadsheetText(
      "produto,preco,observacao\nBatom,49.90,=HYPERLINK(\"https://invalid\")",
      "precos.csv",
    );

    expect(text).toContain("observacao: [formula nao executada]");
    expect(text).not.toContain("HYPERLINK");
  });

  test("requires product and price columns", () => {
    expect(() =>
      extractCatalogSpreadsheetText("sku,estoque\nABC,10", "catalogo.csv"),
    ).toThrow("colunas de produto");
  });

  test("caps catalog size", () => {
    const rows = Array.from(
      { length: 1_001 },
      (_, index) => `Produto ${index},${index + 1}`,
    );

    expect(() =>
      extractCatalogSpreadsheetText(
        `produto,preco\n${rows.join("\n")}`,
        "catalogo.csv",
      ),
    ).toThrow("limite de 1000 produtos");
  });
});

async function createDocx(paragraphs: string[]) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs
    .map((paragraph) => `<w:p><w:r><w:t>${escapeXml(paragraph)}</w:t></w:r></w:p>`)
    .join("")}<w:sectPr/></w:body>
</w:document>`,
  );
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes], "documento.docx", { type: DOCX_MIME });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
