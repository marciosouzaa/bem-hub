import { describe, expect, test } from "bun:test";
import { buildUsageSnapshot } from "./queries";

describe("buildUsageSnapshot", () => {
  test("keeps explicit usage and unanswered counts", () => {
    expect(
      buildUsageSnapshot({
        completions24h: 3,
        completions7d: 10,
        unanswered7d: 2,
      }),
    ).toEqual({
      completions24h: 3,
      completions7d: 10,
      unanswered7d: 2,
    });
  });

  test("does not allow unanswered count above total", () => {
    expect(
      buildUsageSnapshot({
        completions24h: 0,
        completions7d: 2,
        unanswered7d: 3,
      }).unanswered7d,
    ).toBe(2);
  });
});
