import { describe, expect, test } from "bun:test";
import { serializeEmbedding, serializeEmbeddingBatch } from "./embeddings";

describe("serializeEmbedding", () => {
  test("serializes numeric embeddings for pgvector Data API", () => {
    expect(serializeEmbedding([0.25, -1, 0])).toBe("[0.25,-1,0]");
  });

  test("serializes an empty vector deterministically", () => {
    expect(serializeEmbedding([])).toBe("[]");
  });

  test("rejects an incomplete embedding batch", () => {
    expect(() => serializeEmbeddingBatch([[0.1]], 2)).toThrow(
      "quantidade invalida de embeddings",
    );
  });
});
