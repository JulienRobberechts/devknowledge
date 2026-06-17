# Glossary — Key Concepts

## RAG (Retrieval-Augmented Generation)

The core architectural pattern of the project. Instead of querying the LLM directly, the system first **retrieves** the most relevant document passages, then injects them into the LLM prompt so it generates a response **grounded** in those sources. This allows answering questions over a private corpus without retraining the model.

**Main flow:** question → embedding → vector search → chunks → prompt → LLM → answer

---

## Chunk

A fragment of text produced by splitting a document. Each chunk has:
- `content` — the raw text,
- `embedding` — its vector representation,
- metadata (`position`, `startChar`, `endChar`).

The size and overlap of chunks (`chunkSize`, `chunkOverlap`) directly impact retrieval quality.

**Key file:** `domain/entities/Chunk.ts`

---

## Chunking Strategy

The process of splitting a document's raw text into chunks. Two strategies are available:

- **`RecursiveChunkingStrategy`** — splits by token count, seeking the best natural boundary (double newline, single newline, period, space). Preserves text coherence.
- **`SentenceChunkingStrategy`** — splits on sentence boundaries (punctuation + uppercase), then groups sentences until `chunkSize` is reached. Applies **overlap** by re-injecting the last sentences of the previous chunk at the start of the next.

**Key files:** `domain/services/RecursiveChunkingStrategy.ts`, `SentenceChunkingStrategy.ts`

---

## Overlap

The number of tokens shared between two consecutive chunks. Overlap prevents a reasoning span from being cut in two by ensuring a sentence near a chunk boundary appears fully in at least one of the two chunks. Configured via `chunkOverlap`.

---

## Embedding

A numerical representation of a text as an array of floats (e.g. `number[]` of dimension 1024). Semantically similar texts produce vectors that are close in this space. This is what enables **semantic search**: vectors are compared rather than keywords.

**Important subtlety:** the `ITextEncoder` interface distinguishes `"query"` (embedding of the question) from `"document"` (embedding of a chunk being indexed). Some models (e.g. Voyage AI) optimize the vector differently depending on this role.

**Key file:** `domain/ports/ITextEncoder.ts`

---

## Vector Search

Retrieves chunks by **cosine similarity** between the query vector and stored chunk vectors. Implemented via the **pgvector** PostgreSQL extension using the `<=>` operator (cosine distance). A score of `1 - distance` is computed and filtered by `minScore`.

```sql
1 - (embedding <=> $1::vector) AS score
```

**Key file:** `infrastructure/db/PgVectorChunkRepository.ts`

---

## Hybrid Search

Combines vector search with SQL full-text search (`ts_rank_cd` + `plainto_tsquery`). The two result lists are merged via the **RRF** algorithm (see below). This recovers documents containing exact terms (proper nouns, codes) that vector search alone might miss.

**Enabled by:** `searchMode: "hybrid"` in `SearchKnowledge`

---

## RRF (Reciprocal Rank Fusion)

A rank merging algorithm. For each document appearing in a result list, its RRF score is `1 / (k + rank)` (default `k = 60`). Scores are summed across all lists. This favors documents ranked well in multiple sources without requiring heterogeneous scores to be normalized.

**Key file:** `PgVectorChunkRepository.ts` → `computeRRFScores()`

---

## Reranking

An optional post-retrieval step. A large pool of candidates is first retrieved (`limit × candidateMultiplier`), then a reranking model (e.g. Voyage Rerank) reorders them by fine-grained relevance to the question. More precise than vector similarity alone, but more costly in API calls.

**Key files:** `domain/ports/IRerankPort.ts`, `application/SearchKnowledge.ts`

---

## Ingestion

The pipeline that processes a document to make it searchable:
1. Download the file from storage (`IFileStoragePort`),
2. Parse it into raw text (`IFileParserPort`),
3. Split into chunks (configured strategy),
4. Compute embeddings in batches (`BATCH_SIZE = 20`),
5. Persist chunks with their vectors (`IChunkRepository`).

**Key file:** `application/IngestDocument.ts`

---

## Sliding Window (conversation history)

To avoid overloading the LLM prompt with the full conversation history, only the last `SLIDING_WINDOW_EXCHANGES = 4` exchanges (4 user/assistant pairs, i.e. 8 messages) are injected into the prompt. Older messages are silently dropped.

**Key file:** `application/AskQuestion.ts`

---

## Response Grounding

An optional mechanism that evaluates the reliability of the LLM-generated answer. Three strategies are available and can be combined:

### `faithfulness`
Asks the LLM to list each factual claim in the answer and indicate whether it is explicitly supported by the retrieved sources. Produces a score from `0` to `1` (proportion of supported claims).

### `counterfactual`
Compares the RAG-generated answer to an answer generated **without** any sources (from the LLM's training knowledge only). If the two answers are similar, the RAG context added no value (score = 0). If they differ, the RAG context was actually used (score = 1).

### `citation_forcing`
Injects an instruction into the prompt forcing the LLM to tag each claim with `[SOURCE N]` or `[OWN KNOWLEDGE]`. These markers are then parsed to build a list of traced claims, and stripped from the final text shown to the user.

**Key files:** `application/responseChecks/`, `domain/entities/Message.ts` → `KnowledgeCheckResult`

---

## Source Citation

An object attached to each assistant message, tracing the chunks used to generate the response. Contains: `chunkId`, `documentId`, `documentTitle`, `excerpt` (chunk extract), `score` (similarity score).

**Key file:** `domain/entities/Message.ts` → `SourceCitation`

---

## Hexagonal Architecture (Ports & Adapters)

The codebase is organized into three isolated layers:
- **`domain/`** — pure entities and interfaces (ports), with no external dependencies.
- **`application/`** — business use cases that orchestrate the domain through ports.
- **`infrastructure/`** — concrete implementations of ports (PostgreSQL, Anthropic, Voyage AI, file storage).

Ports (`ILLMPort`, `ITextEncoder`, `IRerankPort`, etc.) are TypeScript interfaces that infrastructure implements. This allows swapping an implementation (e.g. replacing Voyage with another provider) without touching business logic.

---

## pgvector

A PostgreSQL extension that adds a `vector(N)` column type and distance operators (`<=>` cosine, `<->` L2, `<#>` dot product). It stores embeddings directly in the database and enables ANN (Approximate Nearest Neighbor) search via an HNSW or IVFFlat index.

**Used in:** `PgVectorChunkRepository.ts` (column `embedding::vector`)

---

## LLM Streaming

Instead of waiting for the full LLM response, tokens are emitted incrementally via an `onToken(token: string)` callback. This allows the frontend to display the answer progressively (Server-Sent Events). The `ILLMPort.stream()` interface returns the full string at end of stream while calling `onToken` for each fragment.

**Key file:** `domain/ports/ILLMPort.ts`
