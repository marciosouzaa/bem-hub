import { describe, expect, test } from "bun:test";
import { evaluateCase, validateBenchmarkDocuments } from "./benchmark-rag";

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

  test("ignores Markdown and terminal punctuation in literal evaluation", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "17 dias corridos.",
        documents: ["manual-de-reembolsos.md"],
        shouldHaveAnswer: true,
        allowParaphrase: false,
      }),
      "O prazo é de **17 dias corridos**, após aprovação. [Fonte 1]",
      ["manual-de-reembolsos.md"],
      "grounded",
      20,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.exactAnswerPresent).toBe(true);
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
    expect(result.needsHumanReview).toBe(false);
  });

  test("accepts explicit absence after a subject prefix", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "Não existe essa informação no corpus.",
        documents: [],
        shouldHaveAnswer: false,
        allowParaphrase: true,
      }),
      "A informação sobre o telefone não foi encontrada na base.",
      [],
      "grounded",
      20,
    );

    expect(result.automaticPass).toBe(true);
  });

  test("sends paraphrased answers to review after hard criteria pass", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "O prazo depende das regras aplicaveis.",
        documents: ["politica-de-ferias.md"],
        shouldHaveAnswer: true,
        allowParaphrase: true,
      }),
      "A solicitacao precisa respeitar o prazo da politica. [Fonte 1]",
      ["politica-de-ferias.md"],
      "grounded",
      30,
    );

    expect(result.automaticPass).toBeNull();
    expect(result.needsHumanReview).toBe(true);
  });

  test("honors optional retrieval and citation criteria", () => {
    const testCase = benchmarkCase({
      answer: "Resposta exata.",
      documents: ["documento.md"],
      shouldHaveAnswer: true,
      allowParaphrase: false,
    });
    testCase.evaluation.must_find_documents = false;
    testCase.evaluation.must_cite_sections = false;

    const result = evaluateCase(
      testCase,
      "Resposta exata.",
      [],
      "grounded",
      10,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.expectedDocumentsFound).toBeNull();
    expect(result.citationPresent).toBeNull();
  });

  test("accepts some expected documents when partial evidence is allowed", () => {
    const testCase = benchmarkCase({
      answer: "Resposta exata.",
      documents: ["documento-a.md", "documento-b.md"],
      shouldHaveAnswer: true,
      allowParaphrase: false,
    });
    testCase.evaluation.allow_partial = true;

    const result = evaluateCase(
      testCase,
      "Resposta exata. [Fonte 1]",
      ["documento-a.md"],
      "grounded",
      10,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.expectedDocumentsFound).toBe(true);
  });

  test("fails a literal answer without its required citation", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "17 dias corridos.",
        documents: ["manual.md"],
        shouldHaveAnswer: true,
        allowParaphrase: false,
      }),
      "O prazo e de 17 dias corridos.",
      ["manual.md"],
      "grounded",
      10,
    );

    expect(result.automaticPass).toBe(false);
    expect(result.citationPresent).toBe(false);
  });

  test("fails a cited answer when retrieved evidence misses required section", () => {
    const testCase = benchmarkCase({
      answer: "17 dias corridos.",
      documents: ["manual.md"],
      shouldHaveAnswer: true,
      allowParaphrase: false,
    });
    testCase.expected.sections = ["Prazo de pagamento"] as string[];

    const result = evaluateCase(
      testCase,
      "O prazo e de 17 dias corridos. [Fonte 1]",
      ["manual.md"],
      "grounded",
      10,
      "Canal oficial",
    );

    expect(result.automaticPass).toBe(false);
    expect(result.expectedSectionsFound).toBe(false);
  });

  test("passes an ambiguous case only with an explicit clarification signal", () => {
    const testCase = benchmarkCase({
      answer: "A pergunta e ambigua.",
      documents: [],
      shouldHaveAnswer: false,
      allowParaphrase: true,
    });
    testCase.category = "ambiguous";

    const result = evaluateCase(
      testCase,
      "A pergunta e ambigua; poderia especificar qual processo?",
      ["manual.md", "politica.md"],
      "grounded",
      10,
    );

    expect(result.automaticPass).toBe(true);
    expect(result.uncertaintyPresent).toBe(true);
  });

  test("accepts a process-dependent ambiguity signal", () => {
    const testCase = benchmarkCase({
      answer: "A pergunta e ambigua.",
      documents: [],
      shouldHaveAnswer: false,
      allowParaphrase: true,
    });
    testCase.category = "ambiguous";

    const result = evaluateCase(
      testCase,
      "Depende do processo a que você se refere.",
      ["manual.md", "politica.md"],
      "grounded",
      10,
    );

    expect(result.automaticPass).toBe(true);
  });

  test("fails an unanswerable case when the model invents a confident answer", () => {
    const result = evaluateCase(
      benchmarkCase({
        answer: "Nao existe essa informacao no corpus.",
        documents: [],
        shouldHaveAnswer: false,
        allowParaphrase: true,
      }),
      "O telefone oficial e (11) 5555-0101.",
      [],
      "no_match",
      10,
    );

    expect(result.automaticPass).toBe(false);
    expect(result.uncertaintyPresent).toBe(false);
  });
});

describe("validateBenchmarkDocuments", () => {
  test("accepts complete corpus without answer keys", () => {
    expect(
      validateBenchmarkDocuments(
        ["manual.md", "politica.md"],
        ["Manual.md", "POLITICA.md"],
      ),
    ).toEqual({ missingDocumentNames: [], blockedDocumentNames: [] });
  });

  test("flags missing expected documents and indexed answer keys", () => {
    expect(
      validateBenchmarkDocuments(
        ["manual.md", "politica.md"],
        ["manual.md", "roteiro-de-validacao-rag.md", "gabarito.csv"],
      ),
    ).toEqual({
      missingDocumentNames: ["politica.md"],
      blockedDocumentNames: ["roteiro-de-validacao-rag.md", "gabarito.csv"],
    });
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
      sections: [] as string[],
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
