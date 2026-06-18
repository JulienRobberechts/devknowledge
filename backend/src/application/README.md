# application

Use cases orchestrating the `domain` via ports, with no infrastructure implementation details.

Called by `../api`, depends on ports defined in `../infra-ports` (implemented by `../infrastructure`).

---

## Documents

| Class | Description |
|---|---|
| `CreateDocument` | Uploads the raw file to storage and persists the document entry in the database (status `pending`, before ingestion). |
| `IngestDocument` | Parses, splits into chunks, and generates embeddings for a document to make it queryable. |
| `SummarizeDocument` | Generates an LLM summary from a document's chunks and persists it in the database. |

## RAG (`rag/`)

| Class | Description |
|---|---|
| `RetrieveKnowledge` | Searches for the most relevant chunks by vector or in hybrid mode, with optional reranking. |
| `AskQuestion` | Answers a user question via RAG — retrieves relevant chunks, streams the LLM response, and applies the configured quality checks. |
| `SourceCitationResolver` | Resolves chunk references into document sources (title, URL) to enrich messages. |
| `ConversationTitleGenerator` | Generates a short title for a conversation from the first question/answer pair. |

### Response grounding (`rag/responseGrounding/`)

| Class / Strategy | Description |
|---|---|
| `CheckResponseGrounding` | Orchestrates grounding strategies and aggregates their results. |
| `faithfulness` | Evaluates whether each claim in the response is grounded in the retrieved chunks. |
| `citationForcing` | Forces the LLM to cite sources inline, then parses the citations to score grounding. |
| `counterfactual` | Detects the added value of RAG by comparing the response with and without context. |

## Quiz

| Class | Description |
|---|---|
| `GenerateQuiz` | Generates multiple-choice questions from document content via the LLM. |

## Administration

| Class | Description |
|---|---|
| `AppSettingsService` | Reads and updates the runtime configuration (embedding provider, storage, chunking strategy) persisted in the database. |
| `CheckStorageConsistency` | Detects orphaned files (storage entry without DB record) and missing files (DB record without file). |
| `ResetAll` | Deletes all files from storage and truncates all tables, then applies new settings if provided. |
