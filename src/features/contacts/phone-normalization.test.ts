import { describe, expect, test } from "bun:test";

import {
  formatContactPhone,
  normalizeContactPhone,
} from "@/features/contacts/phone-normalization";

describe("normalizeContactPhone", () => {
  test("normaliza celular brasileiro com nono dígito", () => {
    expect(normalizeContactPhone("+55 (21) 99676-3611")).toEqual({
      canonicalPhone: "5521996763611",
      countryCode: "55",
      matchKey: "br:5521996763611",
      reason: "brazilian_mobile",
      status: "supported",
    });
  });

  test("gera mesma chave para celular brasileiro na convenção antiga", () => {
    expect(normalizeContactPhone("21 9676-3611")).toMatchObject({
      canonicalPhone: "5521996763611",
      matchKey: "br:5521996763611",
      reason: "legacy_mobile_ninth_digit_added",
      status: "supported",
    });
  });

  test("não adiciona nono dígito em telefone fixo", () => {
    expect(normalizeContactPhone("11 3333-4444")).toMatchObject({
      canonicalPhone: "551133334444",
      matchKey: "br:551133334444",
      reason: "brazilian_landline",
      status: "supported",
    });
  });

  test("preserva outro DDI com deduplicação exata", () => {
    expect(normalizeContactPhone("+1 415 555 2671")).toEqual({
      canonicalPhone: "14155552671",
      countryCode: null,
      matchKey: "intl:14155552671",
      reason: "country_not_supported",
      status: "unsupported_country",
    });
  });

  test("rejeita número impossível sem lançar exceção", () => {
    expect(normalizeContactPhone("123")).toMatchObject({
      matchKey: null,
      reason: "invalid_length",
      status: "invalid",
    });
  });

  test("formata número brasileiro para leitura", () => {
    expect(formatContactPhone("5521996763611", "supported"))
      .toBe("+55 (21) 99676-3611");
  });
});
