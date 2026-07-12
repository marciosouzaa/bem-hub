import { describe, expect, test } from "bun:test";
import { parseIntegrationAudit } from "./audit";

describe("parseIntegrationAudit", () => {
  test("normalizes a complete operational audit", () => {
    const result = parseIntegrationAudit({
      platform: "  Nuvemshop  ", apiAccess: "unknown",
      inventorySource: "PDV local", ordersSource: "Loja virtual",
      customersSource: "Planilha comercial", notes: "  Validar token.  ",
    });
    expect(result.success && result.data.platform).toBe("Nuvemshop");
    expect(result.success && result.data.notes).toBe("Validar token.");
  });

  test("rejects incomplete source mapping", () => {
    expect(parseIntegrationAudit({ platform: "Loja", apiAccess: "yes" }).success).toBe(false);
  });
});
