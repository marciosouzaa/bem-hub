import { describe, expect, test } from "bun:test";
import { buildCatalogAssistantTemplate } from "./catalog-template";

describe("buildCatalogAssistantTemplate", () => {
  test("includes brand and selected language", () => {
    const template = buildCatalogAssistantTemplate({
      brandName: "Aurora Cosmeticos",
      tone: "consultivo",
    });

    expect(template.description).toContain("Aurora Cosmeticos");
    expect(template.instructions).toContain("linguagem consultiva");
    expect(template.instructions).toContain("nao encontrou evidencia suficiente");
    expect(template.instructions).toContain("revisao humana");
  });

  test("uses a safe fallback when brand is empty", () => {
    const template = buildCatalogAssistantTemplate({
      brandName: "   ",
      tone: "direto",
    });

    expect(template.instructions).toContain("catalogo da empresa");
  });
});
