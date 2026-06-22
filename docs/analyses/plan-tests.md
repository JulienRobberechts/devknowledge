# Test Coverage Analysis

Based on `.claude/test-taxonomy.md`.

## Summary Table

| Type | Taxonomy name | ROI | Status | Test files |
|------|--------------|-----|--------|------------|
| Unit — Core (B) | `u-core` | 17.0 | ✅ Present | `domain/services/ChunkingStrategies.test.ts`, `app/rag/responseGrounding/strategies/citationForcing.test.ts` |
| Unit — Frontend (F) | `u-ui` | 5.0 | ✅ Present | `services/sse.test.ts` (8 tests), `hooks/useSSEStream.test.ts` (6 tests), `hooks/useDocuments.test.ts` (5 tests) |
| Module — API (A) | `1-api` | 3.18 | ✅ Present | `api/routes/conversations.test.ts`, `documents.test.ts`, `search.test.ts`, `middleware/apiKeyAuth.test.ts`, `errorHandler.test.ts` |
| Module — CLI (A) | `1-cli` | 3.18 | N/A | No CLI in project |
| Module — Core + fakes (B) | `1-core` | 3.0 | ✅ Present | `app/knowledgeBase/IngestDocument.test.ts`, `app/rag/AskQuestion.test.ts`, `ConversationService.test.ts`, `RetrieveKnowledge.test.ts` |
| Module — Infra adapters (C) | `1-infra-*` | 1.25 | ✅ Partial | `infra/ai/`: Voyage, Anthropic, Rerank — `infra/storage/parsers/`: Markdown, Multi, Pdf, Text — `infra/storage/files/`: Local, R2 *(mocked SDK, no real network calls)* |
| Module — Infra Postgres (C, real DB) | `1-infra-Pg*` | 1.25 | ✅ Present | `tests/integration/PgChunkRepository.test.ts`, `PgConversationRepository.test.ts`, `PgDocumentRepository.test.ts` |
| Int — API + Core (A+B) | `2-api-X-core` | 1.45 | — Volume=0 | Intentionally absent (taxonomy recommends 0) |
| Int — Core + Infra (B+C) | `2-core-X-infra` | 1.23 | — Volume=0 | Intentionally absent |
| Int — Front + API (F+A) | `2-front-X-api` | 1.10 | — Volume=0 | Intentionally absent |
| Int — Front→Core (F+A+B) | `3-front-to-core` | 1.00 | — Volume=0 | Intentionally absent |
| Int — API→Infra (A+B+C) | `3-api-to-infra` | 1.14 | ✅ Present | `tests/retrieval/venise-simplon-orient-express.retrieval.test.ts` |
| E2E full (F+A+B+C) | `4-e2e` | 1.03 | ❌ Missing | — |
| Contract — Port interface | `port-contract` | 2.02 | ❌ Missing | — |
| Contract — External API | `api-contract` | 1.38 | ❌ Missing | — |
| Contract — Architecture | `arch` | 6.67 | ✅ Present | `tests/arch/architecture.test.ts` |

## High-ROI Gaps (priority order)

1. **`port-contract`** (ROI 2.02) — in-memory fakes (`InMemoryChunkRepository`, etc.) are never validated against real Pg implementations
