# infra-ports

Interfaces (hexagonal architecture) defining contracts between the domain and infrastructure. Naming convention: `I` prefix.

- `IChunkRepository` — persistence and search (vector/hybrid) of chunks
- `IConversationRepository` — persistence of conversations and messages
- `IDocumentRepository` — persistence of documents
- `IDocumentSummaryRepository` — persistence of document summaries
- `IEmbeddingPort` — embedding generation
- `IDocumentParserPort` — text extraction from document content (buffer)
- `IFileStoragePort` — file storage (upload/download/delete)
- `ILLMPort` — LLM call (streaming)
- `IRerankPort` — reranking of search results

Each port is implemented by one or more adapters in `../../infra`.
