import { describe, expect, test } from "bun:test";
import { serializeEmbedding } from "./embeddings";

describe("serializeEmbedding", () => {
  test("serializes numeric embeddings for pgvector Data API", () => {
    expect(serializeEmbedding([0.25, -1, 0])).toBe("[0.25,-1,0]");
  });

  test("serializes an empty vector deterministically", () => {
    expect(serializeEmbedding([])).toBe("[]");
  });
});
