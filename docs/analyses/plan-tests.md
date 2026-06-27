# Test Coverage Analysis

Based on `.claude/test-taxonomy.md`.

## Unit Tests (Level 0)

| Type | Taxonomy name | ROI | CI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|----|--------|------------|-----:|----------:|-------:|
| Unit — Core (B) | `u-core` | 17.0 | ✅ | ✅ Present | `domain/services/ChunkingStrategies.u-core.test.ts` (15), `app/rag/responseGrounding/strategies/citationForcing.u-core.test.ts` (9) | 24 | ~28 | 86% |
| Unit — Frontend (F) | `u-ui` | 5.0 | ✅ | ✅ Present | `services/sse.u-ui.test.ts` (6), `hooks/useSSEStream.u-ui.test.ts` (6), `hooks/useDocuments.u-ui.test.ts` (5) | 17 | ~28 | 61% |
| Unit — API internals (A) | `u-api` | 12.0 | ✅ | ✅ Present | `api/middleware/apiKeyAuth.u-api.test.ts` (3), `api/middleware/errorHandler.u-api.test.ts` (3) | 6 | ~10 | 60% |
| Unit — Infra internals (C) | `u-infra` | 8.13 | ✅ | ✅ Present | `infra/storage/parsers/` (4 files), `infra/ai/` (3 adapters), `infra/storage/files/R2FileStorage` (3 mock-only cases) — all `*.u-infra.test.ts` | 32 | ~40 | 80% |

## Module Tests (Level 1)

| Type | Taxonomy name | ROI | CI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|----|--------|------------|-----:|----------:|-------:|
| Module — API (A) | `1-api` | 3.18 | ✅ | ✅ Present | `api/routes/` (7 files: `admin`(14), `auth`(12), `config`(5), `conversations`(26), `documents`(23), `quizzes`(9), `search`(8)) | 97 | ~105 | 92% |
| Module — CLI (A) | `1-cli` | 3.18 | — | N/A | No CLI in project | — | — | — |
| Module — Core + fakes (B) | `1-core` | 3.0 | ✅ | ✅ Present | `app/knowledgeBase/IngestDocument.1-core.test.ts` (8), `app/rag/AskQuestion.1-core.test.ts` (8), `ConversationService.1-core.test.ts` (5), `RetrieveKnowledge.1-core.test.ts` (13) | 34 | ~55 | 62% |
| Module — Infra (C) | `1-infra` | 1.25 | ⚠️ | ✅ Full | → see detail table below (all `*.1-infra.test.ts`, backed by shared `testI*Port.ts` contracts) | 62 | ~70 | 89% |

## Summary Table

| Type | Taxonomy name | ROI | CI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|----|--------|------------|-----:|----------:|-------:|
| Int — API + Core (A+B) | `2-api-X-core` | 1.45 | — | — Volume=0 | Intentionally absent (taxonomy recommends 0) | 0 | 0 | — |
| Int — Core + Infra (B+C) | `2-core-X-infra` | 1.23 | — | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front + API (F+A) | `2-front-X-api` | 1.10 | — | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front→Core (F+A+B) | `3-front-to-core` | 1.00 | — | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — API→Infra (A+B+C) | `e2e-api` | 1.14 | ⚠️ | — Volume=0 | Intentionally absent | 0 | ~8 | — |
| Quality — Retrieval accuracy | `retrieval-quality` | 2.33 | ❌ | ✅ Present | `tests/retrieval/venise-simplon-orient-express.retrieval-quality.test.ts` (2) | 2 | ~5 | 40% |
| E2E full (F+A+B+C) | `e2e-ui` | 1.03 | ❌ | ❌ Missing | — | 0 | ~4 | 0% |
| Contract — Port interface | `port-contract` | 2.02 | ✅ | ✅ Full | `tests/port-contract/` (9 files) — all InMemory fakes wired to shared `testI*Port.ts` contracts; 1 skipped: cascade FK (DB-only behavior) | 50 | ~55 | 91% |
| Contract — External API | `api-contract` | 1.38 | ❌ | ❌ Missing | — | 0 | ~5 | 0% |
| Contract — Architecture | `arch` | 6.67 | ✅ | ✅ Present | `tests/arch/architecture.arch.test.ts` (1) | 1 | 1 | 100% |

## Infra Adapters — Detail per Implementation

### `infra/ai/`

| Adapter | Port | u-infra | 1-infra | Test files | u-infra done | 1-infra done |
|---------|------|---------|---------|------------|------------:|-------------:|
| `VoyageEmbeddingAdapter` | `ITextEncoder` | ✅ | ✅ | `VoyageEmbeddingAdapter.u-infra.test.ts`, `testITextEncoderPort.ts` (×1 impl) | 5 | 4 |
| `AnthropicLLMAdapter` | `ILLMPort` | ✅ | ✅ | `AnthropicLLMAdapter.u-infra.test.ts`, `testILLMPort.ts` (×1 impl) | 4 | 1 |
| `NoopRerankAdapter` | `IRerankPort` | — | ✅ | `testIRerankPort.ts` (×2 impls) | 0 | 2 |
| `VoyageRerankAdapter` | `IRerankPort` | ✅ | ✅ | `VoyageRerankAdapter.u-infra.test.ts`, `testIRerankPort.ts` + 1 extra | 4 | 3 |

### `infra/storage/files/`

| Adapter | Port | u-infra | 1-infra | Test files | u-infra done | 1-infra done |
|---------|------|---------|---------|------------|------------:|-------------:|
| `DynamicFileStorage` | `IFileStoragePort` | ❌ | ❌ | — | 0 | 0 |
| `LocalFileStorage` | `IFileStoragePort` | — | ✅ | `testIFileStoragePort.ts` (×2 impls) | 0 | 8 |
| `R2FileStorage` | `IFileStoragePort` | ✅ | ✅ | `R2FileStorage.u-infra.test.ts` (mock-only cases), `testIFileStoragePort.ts` | 3 | 8 |

> `R2FileStorage.u-infra.test.ts` retains 3 mock-only cases (ContentType passthrough, delete key, pagination) that cannot be verified via the real port contract at reasonable cost.

### `infra/storage/parsers/` — `u-infra` (pure transformation, no external I/O)

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `MarkdownParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MarkdownParser.u-infra.test.ts` | 4 | ~5 | 80% |
| `MultiFileParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MultiFileParser.u-infra.test.ts` | 4 | ~5 | 80% |
| `PdfParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/PdfParser.u-infra.test.ts` | 5 | ~6 | 83% |
| `TextParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/TextParser.u-infra.test.ts` | 3 | ~4 | 75% |

### `infra/persistence/db/`

| Adapter | Port | Status | Contract | Done | ~Possible | Densité |
|---------|------|--------|----------|-----:|----------:|-------:|
| `PgAppSettingsRepository` | `IAppSettingsRepository` | ✅ | `testIAppSettingsRepositoryPort.ts` | 5 | ~6 | 83% |
| `PgConversationRepository` | `IConversationRepository` | ✅ | `testIConversationRepositoryPort.ts` | 9 | ~10 | 90% |
| `PgDocumentRepository` | `IDocumentRepository` | ✅ | `testIDocumentRepositoryPort.ts` | 9 | ~10 | 90% |
| `PgDocumentSummaryRepository` | `IDocumentSummaryRepository` | ✅ | `testIDocumentSummaryRepositoryPort.ts` | 5 | ~6 | 83% |
| `PgVectorChunkRepository` | `IChunkRepository` | ✅ | `testIChunkRepositoryPort.ts` | 8 | ~8 | 100% |

## High-ROI Gaps

No remaining high-ROI gaps.

---

## Conformity Audit — No remaining inconsistencies


