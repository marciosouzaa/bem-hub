import { describe, expect, test } from "bun:test";

import { tagFormSchema } from "@/features/tags/tag-schema";

describe("tagFormSchema", () => {
  test("aceita nome, cor hexadecimal e descrição", () => {
    expect(tagFormSchema.safeParse({
      description: "Contato com relacionamento recorrente.",
      hexColor: "#4EE3A3",
      name: "Cliente recorrente",
    }).success).toBe(true);
  });

  test("rejeita cor sem seis dígitos hexadecimais", () => {
    const result = tagFormSchema.safeParse({
      description: "",
      hexColor: "#4EE3",
      name: "Lead",
    });

    expect(result.success).toBe(false);
  });

  test("rejeita nome vazio", () => {
    const result = tagFormSchema.safeParse({
      description: "",
      hexColor: "#61A8FF",
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  test("limita a descrição a quinhentos caracteres", () => {
    const result = tagFormSchema.safeParse({
      description: "a".repeat(501),
      hexColor: "#A78BFA",
      name: "Atenção",
    });

    expect(result.success).toBe(false);
  });
});
