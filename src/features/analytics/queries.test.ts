import { describe, expect, test } from "bun:test";
import { buildOperationalMetrics, buildUsageSnapshot } from "./queries";

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
      failures7d: 0,
      tokens7d: 0,
      activeUsers7d: 0,
      averageLatencyMs: 0,
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

describe("buildOperationalMetrics", () => {
  test("aggregates tokens, users and valid latency", () => {
    expect(buildOperationalMetrics([
      { tokens_input: 10, tokens_output: 20, user_id: "a", metadata: { latency_ms: 100 } },
      { tokens_input: 5, tokens_output: null, user_id: "b", metadata: { latency_ms: 200 } },
      { tokens_input: null, tokens_output: 2, user_id: "a", metadata: {} },
    ])).toEqual({ tokens7d: 37, activeUsers7d: 2, averageLatencyMs: 150 });
  });
});
