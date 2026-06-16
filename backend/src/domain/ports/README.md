# ports

Interfaces (architecture hexagonale) définissant les contrats entre le domaine et l'infrastructure. Convention de nommage : préfixe `I`.

- `IChunkRepository` — persistance et recherche (vectorielle/hybride) des chunks
- `IConversationRepository` — persistance des conversations et messages
- `IDocumentRepository` — persistance des documents
- `IDocumentSummaryRepository` — persistance des résumés de documents
- `IEmbeddingPort` — génération d'embeddings
- `IFileParserPort` — extraction de texte depuis un fichier
- `IFileStoragePort` — stockage de fichiers (upload/download/delete)
- `ILLMPort` — appel au LLM (streaming)
- `IRerankPort` — reranking de résultats de recherche

Chaque port est implémenté par un ou plusieurs adaptateurs dans `../../infrastructure`.
