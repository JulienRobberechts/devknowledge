# domain

Business core, with no framework or infrastructure dependencies.

- `entities/` — `Document`, `Chunk`, `Conversation`, `Message`, `DocumentSummary`
- `services/` — chunking logic (`ChunkingStrategy`, `RecursiveChunkingStrategy`, `SentenceChunkingStrategy`), see `ChunkingStrategy.md`

No dependencies on `api`, `application`, or `infrastructure`.
