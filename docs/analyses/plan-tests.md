# Test Coverage Analysis

Based on `.claude/test-taxonomy.md`.

## Unit Tests (Level 0)

| Type | Taxonomy name | ROI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|--------|------------|-----:|----------:|-------:|
| Unit — Core (B) | `u-core` | 17.0 | ✅ Present | `domain/services/ChunkingStrategies.u-core.test.ts` (15), `app/rag/responseGrounding/strategies/citationForcing.u-core.test.ts` (9) | 24 | ~28 | 86% |
| Unit — Frontend (F) | `u-ui` | 5.0 | ✅ Present | `services/sse.u-ui.test.ts` (6), `hooks/useSSEStream.u-ui.test.ts` (6), `hooks/useDocuments.u-ui.test.ts` (5) | 17 | ~28 | 61% |
| Unit — API internals (A) | `u-api` | 12.0 | ✅ Present | `api/middleware/apiKeyAuth.u-api.test.ts` (3), `api/middleware/errorHandler.u-api.test.ts` (3) | 6 | ~10 | 60% |
| Unit — Infra internals (C) | `u-infra` | 8.13 | ✅ Present | `infra/storage/parsers/` (4 adapters, `*.u-infra.test.ts`) | 16 | ~20 | 80% |

## Module Tests (Level 1)

| Type | Taxonomy name | ROI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|--------|------------|-----:|----------:|-------:|
| Module — API (A) | `1-api` | 3.18 | ✅ Present | `api/routes/` (7 files: `admin`, `auth`, …, `*.1-api.test.ts`) | 26 | ~34 | 76% |
| Module — CLI (A) | `1-cli` | 3.18 | N/A | No CLI in project | — | — | — |
| Module — Core + fakes (B) | `1-core` | 3.0 | ✅ Present | `app/knowledgeBase/IngestDocument.1-core.test.ts` (8), `app/rag/AskQuestion.1-core.test.ts` (8), `ConversationService.1-core.test.ts` (5), `RetrieveKnowledge.1-core.test.ts` (13) | 34 | ~55 | 62% |
| Module — Infra (C) | `1-infra` | 1.25 | ✅ Partial | → see detail table below (all `*.1-infra.test.ts`) | 44 | ~58 | 76% |

## Summary Table

| Type | Taxonomy name | ROI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|--------|------------|-----:|----------:|-------:|
| Int — API + Core (A+B) | `2-api-X-core` | 1.45 | — Volume=0 | Intentionally absent (taxonomy recommends 0) | 0 | 0 | — |
| Int — Core + Infra (B+C) | `2-core-X-infra` | 1.23 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front + API (F+A) | `2-front-X-api` | 1.10 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front→Core (F+A+B) | `3-front-to-core` | 1.00 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — API→Infra (A+B+C) | `e2e-api` | 1.14 | — Volume=0 | Intentionally absent | 0 | ~8 | — |
| Quality — Retrieval accuracy | `retrieval-quality` | 2.33 | ✅ Present | `tests/retrieval/venise-simplon-orient-express.retrieval-quality.test.ts` (2) | 2 | ~5 | 40% |
| E2E full (F+A+B+C) | `e2e-ui` | 1.03 | ❌ Missing | — | 0 | ~4 | 0% |
| Contract — Port interface | `port-contract` | 2.02 | ❌ Missing | — | 0 | ~20 | 0% |
| Contract — External API | `api-contract` | 1.38 | ❌ Missing | — | 0 | ~5 | 0% |
| Contract — Architecture | `arch` | 6.67 | ✅ Present | `tests/arch/architecture.arch.test.ts` (1) | 1 | 1 | 100% |

## Infra Adapters — Detail per Implementation

### `infra/ai/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `VoyageEmbeddingAdapter` | `ITextEncoder` | ✅ | `infra/ai/embeddings/VoyageEmbeddingAdapter.1-infra.test.ts` | 5 | ~6 | 83% |
| `AnthropicLLMAdapter` | `ILLMPort` | ✅ | `infra/ai/llm/AnthropicLLMAdapter.1-infra.test.ts` | 4 | ~6 | 67% |
| `NoopRerankAdapter` | `IRerankPort` | ❌ | — | 0 | ~2 | 0% |
| `VoyageRerankAdapter` | `IRerankPort` | ✅ | `infra/ai/reranking/VoyageRerankAdapter.1-infra.test.ts` | 4 | ~5 | 80% |

### `infra/storage/files/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `DynamicFileStorage` | `IFileStoragePort` | ❌ | — | 0 | ~4 | 0% |
| `LocalFileStorage` | `IFileStoragePort` | ✅ | `infra/storage/files/LocalFileStorage.1-infra.test.ts` | 6 | ~6 | 100% |
| `R2FileStorage` | `IFileStoragePort` | ✅ | `infra/storage/files/R2FileStorage.1-infra.test.ts` | 6 | ~6 | 100% |

### `infra/storage/parsers/` — `u-infra` (pure transformation, no external I/O)

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `MarkdownParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MarkdownParser.u-infra.test.ts` | 4 | ~5 | 80% |
| `MultiFileParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MultiFileParser.u-infra.test.ts` | 4 | ~5 | 80% |
| `PdfParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/PdfParser.u-infra.test.ts` | 5 | ~6 | 83% |
| `TextParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/TextParser.u-infra.test.ts` | 3 | ~4 | 75% |

### `infra/persistence/db/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `PgAppSettingsRepository` | `IAppSettingsRepository` | ❌ | — | 0 | ~4 | 0% |
| `PgConversationRepository` | `IConversationRepository` | ✅ | `tests/integration/PgConversationRepository.1-infra.test.ts` | 7 | ~8 | 88% |
| `PgDocumentRepository` | `IDocumentRepository` | ✅ | `tests/integration/PgDocumentRepository.1-infra.test.ts` | 7 | ~8 | 88% |
| `PgDocumentSummaryRepository` | `IDocumentSummaryRepository` | ❌ | — | 0 | ~4 | 0% |
| `PgVectorChunkRepository` | `IChunkRepository` | ✅ | `tests/integration/PgChunkRepository.1-infra.test.ts` | 5 | ~6 | 83% |

## High-ROI Gaps (priority order)

1. **`port-contract`** (ROI 2.02) — in-memory fakes (`InMemoryChunkRepository`, etc.) are never validated against real Pg implementations

---

## Conformity Audit — Inconsistencies and Required Changes

### `1-infra` — 4 tests misclassified (should be `u-infra`)

The taxonomy defines `1-infra` as testing each C adapter against **real external systems** (no mock, may use Testcontainers). Four tests labeled `1-infra` mock the entire external call and only test request formation and response parsing — which matches `u-infra` ("pure transformation logic inside an infra adapter without hitting any external system"):

| Test file | Current suffix | Issue | Correct suffix |
|-----------|---------------|-------|---------------|
| `infra/ai/embeddings/VoyageEmbeddingAdapter.1-infra.test.ts` | `1-infra` | `vi.stubGlobal("fetch", …)` — no real HTTP call | `u-infra` |
| `infra/ai/reranking/VoyageRerankAdapter.1-infra.test.ts` | `1-infra` | `vi.stubGlobal("fetch", …)` — no real HTTP call | `u-infra` |
| `infra/ai/llm/AnthropicLLMAdapter.1-infra.test.ts` | `1-infra` | `vi.mock("@anthropic-ai/sdk")` — entire SDK replaced | `u-infra` |
| `infra/storage/files/R2FileStorage.1-infra.test.ts` | `1-infra` | S3 client `send` fully mocked — no real R2/S3 call | `u-infra` |

The three Pg repository tests (`PgDocumentRepository`, `PgConversationRepository`, `PgChunkRepository`) and `LocalFileStorage` are correctly classified as `1-infra` — they use a real DB connection or real filesystem I/O.

**Required change:** Rename the four files above from `*.1-infra.test.ts` to `*.u-infra.test.ts` and move them to the `u-infra` row of the plan table (bump `u-infra` Done from 16 → 36, add ~20 possible → ~40; move `1-infra` Done from 44 → 24, possible from ~58 → ~38).

---

### `1-core` — 3 tests use `vi.fn()` stubs instead of in-memory fakes

The taxonomy specifies `1-core` = `fake (C)` (in-memory port implementations). Using `vi.fn()` stubs is `mock`, which can drift silently from the real contract. Three `1-core` tests substitute some C dependencies with stubs:

| Test file | Stubbed C dependencies |
|-----------|----------------------|
| `app/knowledgeBase/IngestDocument.1-core.test.ts` | `fileStorage`, `fileParser`, `embeddingAdapter` — all `vi.fn()` |
| `app/rag/AskQuestion.1-core.test.ts` | `llmAdapter` — `vi.fn()` (app-layer deps like `IRetrieveKnowledge` are correctly mocked since they are B-level collaborators, not C) |
| `app/rag/RetrieveKnowledge.1-core.test.ts` | `embeddingAdapter` — `vi.fn()` |

**Required change:** Replace `vi.fn()` stubs for C ports with dedicated in-memory fake classes (e.g., `InMemoryEmbeddingAdapter`, `InMemoryFileStorage`, `InMemoryFileParser`, `InMemoryLLMAdapter`) placed in `tests/fakes/`. This ensures fake/real parity and makes them eligible for `port-contract` validation.


