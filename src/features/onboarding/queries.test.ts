import { describe, expect, test } from "bun:test";
import { buildOnboardingProgress } from "./queries";

describe("buildOnboardingProgress", () => {
  test("points a new workspace to assistant setup", () => {
    const progress = buildOnboardingProgress({
      hasAssistant: false,
      hasReadyDocument: false,
      hasConversation: false,
    });

    expect(progress.completed).toBe(0);
    expect(progress.percent).toBe(0);
    expect(progress.nextStep?.id).toBe("assistant");
  });

  test("only counts ready documents", () => {
    const progress = buildOnboardingProgress({
      hasAssistant: true,
      hasReadyDocument: false,
      hasConversation: false,
    });

    expect(progress.completed).toBe(1);
    expect(progress.percent).toBe(33);
    expect(progress.nextStep?.id).toBe("knowledge");
  });

  test("finishes after first conversation", () => {
    const progress = buildOnboardingProgress({
      hasAssistant: true,
      hasReadyDocument: true,
      hasConversation: true,
    });

    expect(progress.completed).toBe(3);
    expect(progress.percent).toBe(100);
    expect(progress.nextStep).toBeNull();
  });
});
