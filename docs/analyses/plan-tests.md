# Test Coverage Analysis

Based on `.claude/test-taxonomy.md`.

## Summary Table

| Type | Taxonomy name | ROI | Status | Test files | Done | ~Possibles | Densité |
|------|--------------|-----|--------|------------|-----:|----------:|-------:|
| Unit — Core (B) | `u-core` | 17.0 | ✅ Present | `domain/services/ChunkingStrategies.test.ts` (15), `app/rag/responseGrounding/strategies/citationForcing.test.ts` (9) | 24 | ~28 | 86% |
| Unit — Frontend (F) | `u-ui` | 5.0 | ✅ Present | `services/sse.test.ts` (6), `hooks/useSSEStream.test.ts` (6), `hooks/useDocuments.test.ts` (5) | 17 | ~28 | 61% |
| Module — API (A) | `1-api` | 3.18 | ✅ Present | `api/routes/conversations.test.ts` (11), `documents.test.ts` (12), `search.test.ts` (3), `middleware/apiKeyAuth.test.ts` (3), `errorHandler.test.ts` (3) | 32 | ~40 | 80% |
| Module — CLI (A) | `1-cli` | 3.18 | N/A | No CLI in project | — | — | — |
| Module — Core + fakes (B) | `1-core` | 3.0 | ✅ Present | `app/knowledgeBase/IngestDocument.test.ts` (8), `app/rag/AskQuestion.test.ts` (8), `ConversationService.test.ts` (5), `RetrieveKnowledge.test.ts` (13) | 34 | ~55 | 62% |
| Module — Infra adapters (C) | `1-infra-*` | 1.25 | ✅ Partial | → see detail table below | 41 | ~50 | 82% |
| Module — Infra Postgres (C, real DB) | `1-infra-Pg*` | 1.25 | ✅ Partial | → see detail table below | 19 | ~24 | 79% |
| Int — API + Core (A+B) | `2-api-X-core` | 1.45 | — Volume=0 | Intentionally absent (taxonomy recommends 0) | 0 | 0 | — |
| Int — Core + Infra (B+C) | `2-core-X-infra` | 1.23 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front + API (F+A) | `2-front-X-api` | 1.10 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — Front→Core (F+A+B) | `3-front-to-core` | 1.00 | — Volume=0 | Intentionally absent | 0 | 0 | — |
| Int — API→Infra (A+B+C) | `3-api-to-infra` | 1.14 | ✅ Present | `tests/retrieval/venise-simplon-orient-express.retrieval.test.ts` (2) | 2 | ~8 | 25% |
| E2E full (F+A+B+C) | `4-e2e` | 1.03 | ❌ Missing | — | 0 | ~4 | 0% |
| Contract — Port interface | `port-contract` | 2.02 | ❌ Missing | — | 0 | ~20 | 0% |
| Contract — External API | `api-contract` | 1.38 | ❌ Missing | — | 0 | ~5 | 0% |
| Contract — Architecture | `arch` | 6.67 | ✅ Present | `tests/arch/architecture.test.ts` (1) | 1 | 1 | 100% |

## Infra Adapters — Detail per Implementation

### `infra/ai/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `VoyageEmbeddingAdapter` | `ITextEncoder` | ✅ | `infra/ai/embeddings/VoyageEmbeddingAdapter.test.ts` | 5 | ~6 | 83% |
| `AnthropicLLMAdapter` | `ILLMPort` | ✅ | `infra/ai/llm/AnthropicLLMAdapter.test.ts` | 4 | ~6 | 67% |
| `NoopRerankAdapter` | `IRerankPort` | ❌ | — | 0 | ~2 | 0% |
| `VoyageRerankAdapter` | `IRerankPort` | ✅ | `infra/ai/reranking/VoyageRerankAdapter.test.ts` | 4 | ~5 | 80% |

### `infra/storage/files/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `DynamicFileStorage` | `IFileStoragePort` | ❌ | — | 0 | ~4 | 0% |
| `LocalFileStorage` | `IFileStoragePort` | ✅ | `infra/storage/files/LocalFileStorage.test.ts` | 6 | ~6 | 100% |
| `R2FileStorage` | `IFileStoragePort` | ✅ | `infra/storage/files/R2FileStorage.test.ts` | 6 | ~6 | 100% |

### `infra/storage/parsers/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `MarkdownParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MarkdownParser.test.ts` | 4 | ~5 | 80% |
| `MultiFileParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/MultiFileParser.test.ts` | 4 | ~5 | 80% |
| `PdfParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/PdfParser.test.ts` | 5 | ~6 | 83% |
| `TextParser` | `IDocumentParserPort` | ✅ | `infra/storage/parsers/TextParser.test.ts` | 3 | ~4 | 75% |

### `infra/persistence/db/`

| Adapter | Port | Status | Test file | Done | ~Possible | Densité |
|---------|------|--------|-----------|-----:|----------:|-------:|
| `PgAppSettingsRepository` | `IAppSettingsRepository` | ❌ | — | 0 | ~4 | 0% |
| `PgConversationRepository` | `IConversationRepository` | ✅ | `tests/integration/PgConversationRepository.test.ts` | 7 | ~8 | 88% |
| `PgDocumentRepository` | `IDocumentRepository` | ✅ | `tests/integration/PgDocumentRepository.test.ts` | 7 | ~8 | 88% |
| `PgDocumentSummaryRepository` | `IDocumentSummaryRepository` | ❌ | — | 0 | ~4 | 0% |
| `PgVectorChunkRepository` | `IChunkRepository` | ✅ | `tests/integration/PgChunkRepository.test.ts` | 5 | ~6 | 83% |

## High-ROI Gaps (priority order)

1. **`port-contract`** (ROI 2.02) — in-memory fakes (`InMemoryChunkRepository`, etc.) are never validated against real Pg implementations
