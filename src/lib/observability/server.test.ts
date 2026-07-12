import { describe, expect, test } from "bun:test";
import { getErrorDetails } from "./server";

describe("getErrorDetails", () => {
  test("keeps safe fields from native errors", () => {
    const error = Object.assign(new Error("provider unavailable"), {
      code: "provider_error",
      secret: "must-not-leak",
    });

    expect(getErrorDetails(error)).toEqual({
      name: "Error",
      message: "provider unavailable",
      code: "provider_error",
    });
  });

  test("does not serialize arbitrary values", () => {
    expect(getErrorDetails({ prompt: "sensitive customer content" })).toEqual({
      name: "UnknownError",
      message: "Erro nao serializavel.",
    });
  });

  test("caps external error messages", () => {
    expect(getErrorDetails({ message: "x".repeat(600) }).message).toHaveLength(500);
  });
});
