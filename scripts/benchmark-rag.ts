import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { z } from "zod";
import { getEntitlements } from "@/features/billing/entitlements";
import {
  buildChatSystemPrompt,
  retrieveChatKnowledge,
} from "@/features/chat/rag";
import { resolveAssistantRuntime } from "@/lib/ai/runtime";
import type { Database } from "@/types/database";

const benchmarkCaseSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  category: z.enum(["literal", "multi_chunk", "ambiguous", "no_answer"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  question: z.string().min(1),
  expected: z.object({
    answer: z.string(),
    documents: z.array(z.string()),
    sections: z.array(z.string()),
    policy_codes: z.array(z.string()),
  }),
  evaluation: z.object({
    should_have_answer: z.boolean(),
    must_find_documents: z.boolean(),
    must_cite_sections: z.boolean(),
    allow_paraphrase: z.boolean(),
    allow_partial: z.boolean(),
    expected_behavior: z.string().optional(),
  }),
});

const benchmarkSchema = z.object({
  name: z.string(),
  version: z.number().int().positive(),
  should_index: z.literal(false),
  knowledge_base_documents: z.array(z.string()).min(1),
  tests: z.array(benchmarkCaseSchema).min(1),
});

type BenchmarkCase = z.infer<typeof benchmarkCaseSchema>;
type Benchmark = z.infer<typeof benchmarkSchema>;

type BenchmarkCaseResult = {
  id: string;
  category: BenchmarkCase["category"];
  question: string;
  expectedAnswer: string;
  expectedDocuments: string[];
  answer: string | null;
  retrievedDocuments: string[];
  knowledgeStatus: string | null;
  expectedDocumentsFound: boolean | null;
  expectedSectionsFound: boolean | null;
  citationPresent: boolean | null;
  exactAnswerPresent: boolean | null;
  uncertaintyPresent: boolean | null;
  automaticPass: boolean | null;
  needsHumanReview: boolean;
  latencyMs: number;
  error: string | null;
};

type CliOptions = {
  benchmarkPath: string;
  category: BenchmarkCase["category"] | null;
  limit: number | null;
  outputPath: string | null;
  validateOnly: boolean;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const benchmark = await loadBenchmark(options.benchmarkPath);
  const enabledTests = selectTests(benchmark, options);

  if (options.validateOnly) {
    printValidationSummary(benchmark, enabledTests);
    return;
  }

  const config = loadRuntimeConfig();
  const supabase = createClient<Database>(config.supabaseUrl, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(config.accessToken);

  if (userError || !user) {
    throw new Error("BEM_HUB_BENCHMARK_ACCESS_TOKEN nao representa um usuario valido.");
  }

  const organization = await requireOrganizationAccess(
    supabase,
    config.organizationId,
  );
  await verifyBenchmarkCorpus(supabase, organization.id, benchmark);
  const assistant = await resolveBenchmarkAssistant(
    supabase,
    organization.id,
    config.assistantId,
  );
  const runtime = await resolveAssistantRuntime(supabase, organization.id, assistant);
  const entitlements = await getEntitlements(supabase, organization.id);
  const results: BenchmarkCaseResult[] = [];

  console.log(
    `Executando ${enabledTests.length} casos em ${organization.name} com ${assistant.name} (${runtime.model}).`,
  );

  for (const testCase of enabledTests) {
    const startedAt = performance.now();

    try {
      const rag = await retrieveChatKnowledge({
        entitlements,
        organizationId: organization.id,
        query: testCase.question,
        supabase,
      });
      const generated = await generateText({
        model: runtime.languageModel,
        system: buildChatSystemPrompt(assistant.instructions, rag.systemContext),
        prompt: testCase.question,
        temperature: assistant.temperature,
      });
      const result = evaluateCase(
        testCase,
        generated.text,
        rag.knowledge.sources.map((source) => source.documentName),
        rag.knowledge.status,
        performance.now() - startedAt,
        rag.systemContext,
      );

      results.push(result);
      const status =
        result.automaticPass === true
          ? "PASS"
          : result.automaticPass === false
            ? "FAIL"
            : "REVIEW";
      console.log(`${status} ${testCase.id}`);
    } catch (error) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        question: testCase.question,
        expectedAnswer: testCase.expected.answer,
        expectedDocuments: testCase.expected.documents,
        answer: null,
        retrievedDocuments: [],
        knowledgeStatus: null,
        expectedDocumentsFound: null,
        expectedSectionsFound: null,
        citationPresent: null,
        exactAnswerPresent: null,
        uncertaintyPresent: null,
        automaticPass: false,
        needsHumanReview: true,
        latencyMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : "Falha desconhecida",
      });
      console.log(`ERROR ${testCase.id}`);
    }
  }

  const report = {
    benchmark: benchmark.name,
    version: benchmark.version,
    generatedAt: new Date().toISOString(),
    organizationId: organization.id,
    assistant: {
      id: assistant.id,
      name: assistant.name,
      provider: runtime.provider,
      model: runtime.model,
    },
    summary: summarizeResults(results),
    results,
  };
  const outputPath = resolve(
    options.outputPath ??
      `output/benchmarks/rag-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Relatorio: ${outputPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

export function evaluateCase(
  testCase: BenchmarkCase,
  answer: string,
  retrievedDocuments: string[],
  knowledgeStatus: string,
  latencyMs: number,
  retrievedEvidence = "",
): BenchmarkCaseResult {
  const normalizedRetrieved = new Set(retrievedDocuments.map(normalizeText));
  const expectedDocumentsFound = testCase.evaluation.must_find_documents
    ? testCase.expected.documents[
        testCase.evaluation.allow_partial ? "some" : "every"
      ]((document) => normalizedRetrieved.has(normalizeText(document)))
    : null;
  const citationPresent = testCase.evaluation.must_cite_sections
    ? /\[Fonte\s+\d+\]/iu.test(answer)
    : null;
  const expectedSectionsFound =
    testCase.evaluation.must_cite_sections && testCase.expected.sections.length
    ? testCase.expected.sections[
        testCase.evaluation.allow_partial ? "some" : "every"
      ]((section) =>
        normalizeText(retrievedEvidence).includes(normalizeText(section)),
      )
    : null;
  const exactAnswerPresent = testCase.evaluation.allow_paraphrase
    ? null
    : normalizeText(answer).includes(normalizeText(testCase.expected.answer));
  const uncertaintyPresent = hasUncertaintySignal(answer);
  const hardCriteriaPass =
    (expectedDocumentsFound ?? true) &&
    (expectedSectionsFound ?? true) &&
    (citationPresent ?? true) &&
    exactAnswerPresent !== false;
  const requiresSemanticReview =
    testCase.evaluation.should_have_answer && testCase.evaluation.allow_paraphrase;
  const automaticPass = testCase.evaluation.should_have_answer
    ? hardCriteriaPass
      ? requiresSemanticReview
        ? null
        : true
      : false
    : uncertaintyPresent;

  return {
    id: testCase.id,
    category: testCase.category,
    question: testCase.question,
    expectedAnswer: testCase.expected.answer,
    expectedDocuments: testCase.expected.documents,
    answer,
    retrievedDocuments,
    knowledgeStatus,
    expectedDocumentsFound,
    expectedSectionsFound,
    citationPresent,
    exactAnswerPresent,
    uncertaintyPresent,
    automaticPass,
    needsHumanReview: automaticPass === null,
    latencyMs: Math.round(latencyMs),
    error: null,
  };
}

function summarizeResults(results: BenchmarkCaseResult[]) {
  const categories = Object.fromEntries(
    ["literal", "multi_chunk", "ambiguous", "no_answer"].map((category) => {
      const categoryResults = results.filter((result) => result.category === category);

      return [category, summarizeStatus(categoryResults)];
    }),
  );

  return {
    ...summarizeStatus(results),
    errors: results.filter((result) => result.error).length,
    averageLatencyMs: results.length
      ? Math.round(
          results.reduce((sum, result) => sum + result.latencyMs, 0) /
            results.length,
        )
      : 0,
    categories,
  };
}

function summarizeStatus(results: BenchmarkCaseResult[]) {
  return {
    total: results.length,
    automaticPass: results.filter((result) => result.automaticPass === true).length,
    automaticFail: results.filter((result) => result.automaticPass === false).length,
    needsHumanReview: results.filter((result) => result.automaticPass === null).length,
  };
}

async function loadBenchmark(path: string): Promise<Benchmark> {
  const raw = JSON.parse(await readFile(resolve(path), "utf8"));
  return benchmarkSchema.parse(raw);
}

function selectTests(benchmark: Benchmark, options: CliOptions) {
  const selected = benchmark.tests.filter(
    (testCase) =>
      testCase.enabled &&
      (!options.category || testCase.category === options.category),
  );

  return options.limit ? selected.slice(0, options.limit) : selected;
}

function printValidationSummary(benchmark: Benchmark, tests: BenchmarkCase[]) {
  const categories = Object.fromEntries(
    ["literal", "multi_chunk", "ambiguous", "no_answer"].map((category) => [
      category,
      tests.filter((testCase) => testCase.category === category).length,
    ]),
  );

  console.log(
    JSON.stringify(
      {
        benchmark: benchmark.name,
        version: benchmark.version,
        shouldIndex: benchmark.should_index,
        documents: benchmark.knowledge_base_documents,
        selectedTests: tests.length,
        categories,
      },
      null,
      2,
    ),
  );
}

function loadRuntimeConfig() {
  return z
    .object({
      supabaseUrl: z.string().url(),
      publishableKey: z.string().min(1),
      accessToken: z.string().min(1),
      organizationId: z.string().uuid(),
      assistantId: z.string().uuid().optional(),
    })
    .parse({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      accessToken: process.env.BEM_HUB_BENCHMARK_ACCESS_TOKEN,
      organizationId: process.env.BEM_HUB_BENCHMARK_ORGANIZATION_ID,
      assistantId: process.env.BEM_HUB_BENCHMARK_ASSISTANT_ID || undefined,
    });
}

async function requireOrganizationAccess(
  supabase: ReturnType<typeof createClient<Database>>,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error
        ? `Falha ao validar organizacao: ${error.message}`
        : "Usuario nao possui acesso a organizacao do benchmark.",
    );
  }

  return data;
}

async function resolveBenchmarkAssistant(
  supabase: ReturnType<typeof createClient<Database>>,
  organizationId: string,
  assistantId: string | undefined,
) {
  let query = supabase
    .from("assistants")
    .select(
      "id,name,instructions,provider,provider_connection_id,model,temperature,is_default,created_at",
    )
    .eq("organization_id", organizationId);

  if (assistantId) {
    query = query.eq("id", assistantId);
  } else {
    query = query.eq("is_default", true);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar assistente do benchmark: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      assistantId
        ? "Assistente do benchmark nao encontrado na organizacao."
        : "Defina BEM_HUB_BENCHMARK_ASSISTANT_ID ou configure um assistente padrao.",
    );
  }

  return data;
}

async function verifyBenchmarkCorpus(
  supabase: ReturnType<typeof createClient<Database>>,
  organizationId: string,
  benchmark: Benchmark,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("name,source_kind,superseded_at")
    .eq("organization_id", organizationId)
    .eq("status", "ready");

  if (error) {
    throw new Error(`Falha ao validar documentos do benchmark: ${error.message}`);
  }

  const searchableDocumentNames = data
    .filter(
      (document) =>
        document.source_kind !== "catalog" || document.superseded_at === null,
    )
    .map((document) => document.name);
  const validation = validateBenchmarkDocuments(
    benchmark.knowledge_base_documents,
    searchableDocumentNames,
  );

  if (validation.missingDocumentNames.length || validation.blockedDocumentNames.length) {
    const details = [
      validation.missingDocumentNames.length
        ? `Documentos esperados ausentes: ${validation.missingDocumentNames.join(", ")}.`
        : null,
      validation.blockedDocumentNames.length
        ? `Arquivos de gabarito detectados: ${validation.blockedDocumentNames.join(", ")}. Remova-os da base antes de executar.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    throw new Error(`Corpus do benchmark invalido. ${details}`);
  }
}

export function validateBenchmarkDocuments(
  expectedDocumentNames: string[],
  searchableDocumentNames: string[],
) {
  const normalizedAvailable = new Set(searchableDocumentNames.map(normalizeText));
  const missingDocumentNames = expectedDocumentNames.filter(
    (documentName) => !normalizedAvailable.has(normalizeText(documentName)),
  );
  const blockedDocumentNames = searchableDocumentNames.filter((documentName) =>
    isBenchmarkAnswerKey(documentName),
  );

  return { missingDocumentNames, blockedDocumentNames };
}

function parseOptions(args: string[]): CliOptions {
  if (args.includes("--help")) {
    console.log(`Uso: bun run benchmark:rag -- [opcoes]

--validate-only          Valida o corpus sem chamar Supabase ou IA
--category=<categoria>  literal, multi_chunk, ambiguous ou no_answer
--limit=<numero>         Limita a quantidade de casos executados
--benchmark=<path>       JSON de benchmark (default: docs/benchmarks/benchmark-rag.json)
--output=<path>          Caminho do relatorio JSON`);
    process.exit(0);
  }

  const category = getOption(args, "category");
  const parsedCategory = category
    ? z.enum(["literal", "multi_chunk", "ambiguous", "no_answer"]).parse(category)
    : null;
  const limitValue = getOption(args, "limit");
  const limit = limitValue ? z.coerce.number().int().positive().parse(limitValue) : null;

  return {
    benchmarkPath:
      getOption(args, "benchmark") ?? "docs/benchmarks/benchmark-rag.json",
    category: parsedCategory,
    limit,
    outputPath: getOption(args, "output"),
    validateOnly: args.includes("--validate-only"),
  };
}

function getOption(args: string[], name: string) {
  return args.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\`*_~#[\]()]/g, " ")
    .replace(/[.,;:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasUncertaintySignal(answer: string) {
  const normalized = normalizeText(answer);
  return (
    [
      "nao encontrei",
      "nao ha contexto",
      "nao consta",
      "informacao nao foi encontrada",
      "pergunta e ambigua",
      "pergunta esta ambigua",
      "preciso de mais contexto",
      "poderia especificar",
      "depende do processo",
    ].some((signal) => normalized.includes(signal)) ||
    /\bnao foi encontrad[oa]s?\b/u.test(normalized)
  );
}

function isBenchmarkAnswerKey(documentName: string) {
  const normalized = normalizeText(documentName)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return [
    "benchmark rag",
    "roteiro de validacao rag",
    "gabarito",
    "resposta esperada",
    "respostas esperadas",
  ].some((marker) => normalized.includes(marker));
}
