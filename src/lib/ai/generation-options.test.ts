import { describe, expect, test } from "bun:test";
import { getGenerationTemperatureOptions } from "./generation-options";

describe("getGenerationTemperatureOptions", () => {
  test("omits temperature for OpenAI GPT-5 reasoning models", () => {
    expect(getGenerationTemperatureOptions("openai", "gpt-5.5", 0.4)).toEqual({});
    expect(
      getGenerationTemperatureOptions("openai", "gpt-5.5-2026-04-23", 0.4),
    ).toEqual({});
  });

  test("keeps temperature for models and providers that support it", () => {
    expect(getGenerationTemperatureOptions("openai", "gpt-4.1", 0.4)).toEqual({
      temperature: 0.4,
    });
    expect(getGenerationTemperatureOptions("anthropic", "claude-sonnet", 0.4)).toEqual({
      temperature: 0.4,
    });
  });
});
