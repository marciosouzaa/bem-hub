import { describe, expect, test } from "bun:test";
import { evaluateCase } from "./benchmark-rag";

describe("evaluateCase", () => {
  test("passes a literal answer with expected document and citation", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "17 dias corridos.",
        documents: ["manual-de-reembolsos.md"],
        shouldHaveAnswer: true,
        allowParaphrase: false,
      }),
      "O prazo é de 17 dias corridos. [Fonte 1]",
      ["manual-de-reembolsos.md"],
      "grounded",
      123.4,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.expectedDocumentsFound).toBe(true);
    expect(result.citationPresent).toBe(true);
    expect(result.latencyMs).toBe(123);
  });

  test("fails when an answerable question misses its source", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "Marina Lopes.",
        documents: ["manual-de-reembolsos.md"],
        shouldHaveAnswer: true,
        allowParaphrase: false,
      }),
      "Marina Lopes. [Fonte 1]",
      ["politica-de-ferias.md"],
      "grounded",
      50,
    );

    expect(result.automaticPass).toBe(false);
    expect(result.expectedDocumentsFound).toBe(false);
  });

  test("passes an unanswerable question only when uncertainty is explicit", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "Não existe essa informação no corpus.",
        documents: [],
        shouldHaveAnswer: false,
        allowParaphrase: true,
      }),
      "Não encontrei essa informação na base de conhecimento.",
      [],
      "no_match",
      20,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.uncertaintyPresent).toBe(true);
    expect(result.needsHumanReview).toBe(true);
  });
});

function benchmarkCase({
  allowParaphrase,
  answer,
  documents,
  shouldHaveAnswer,
}: {
  allowParaphrase: boolean;
  answer: string;
  documents: string[];
  shouldHaveAnswer: boolean;
}) {
  return {
    id: "TEST-001",
    enabled: true,
    category: shouldHaveAnswer ? ("literal" as const) : ("no_answer" as const),
    difficulty: "easy" as const,
    question: "Pergunta de teste?",
    expected: {
      answer,
      documents,
      sections: [],
      policy_codes: [],
    },
    evaluation: {
      should_have_answer: shouldHaveAnswer,
      must_find_documents: documents.length > 0,
      must_cite_sections: documents.length > 0,
      allow_paraphrase: allowParaphrase,
      allow_partial: false,
    },
  };
}
