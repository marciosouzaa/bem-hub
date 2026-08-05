import type { AiProvider } from "./providers";

export function getGenerationTemperatureOptions(
  provider: AiProvider,
  model: string,
  temperature: number,
) {
  if (provider === "openai" && /^gpt-5(?:[.-]|$)/iu.test(model.trim())) {
    return {};
  }

  return { temperature };
}
