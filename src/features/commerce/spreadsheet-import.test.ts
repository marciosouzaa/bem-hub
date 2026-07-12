import { describe, expect, test } from "bun:test";
import { importCommerceSpreadsheet } from "./spreadsheet-import";

describe("commerce spreadsheet import", () => {
  test("normalizes Brazilian product values", () => {
    expect(importCommerceSpreadsheet("codigo;sku;produto;preco;estoque\n1;BAT-1;Batom;49,90;12", "products")[0]).toMatchObject({ externalId: "1", priceCents: 4990, stockQuantity: 12 });
  });
  test("normalizes orders independently from provider", () => {
    expect(importCommerceSpreadsheet("id,cliente id,data,total,status\nP1,C1,2026-07-13T10:00:00Z,120.50,pago", "orders")[0]).toMatchObject({ externalId: "P1", totalCents: 12050, status: "pago" });
  });
  test("rejects malformed rows with line number", () => {
    expect(() => importCommerceSpreadsheet("id;sku;produto;preco;estoque\n1;;Batom;xx;2", "products")).toThrow("linha 2");
  });
});
