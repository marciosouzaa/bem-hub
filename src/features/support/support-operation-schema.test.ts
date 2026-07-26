import { describe, expect, test } from "bun:test";

import {
  supportOperationInputSchema,
} from "@/features/support/support-operation-schema";

const baseInput = {
  conversationId: "10000000-0000-4000-8000-000000000001",
  expectedVersion: 1,
  priority: null,
  userId: null,
};

describe("supportOperationInputSchema", () => {
  test("accepts a tenant-safe lifecycle command", () => {
    expect(
      supportOperationInputSchema.safeParse({
        ...baseInput,
        operation: "take",
      }).success,
    ).toBe(true);
  });

  test("requires a priority for priority changes", () => {
    expect(
      supportOperationInputSchema.safeParse({
        ...baseInput,
        operation: "set_priority",
      }).success,
    ).toBe(false);
  });

  test("rejects stale or invalid version values before the RPC", () => {
    expect(
      supportOperationInputSchema.safeParse({
        ...baseInput,
        expectedVersion: 0,
        operation: "pending",
      }).success,
    ).toBe(false);
  });
});
