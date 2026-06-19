import type {
  CitationResolution,
  ISourceCitationResolver,
} from "../../app-ports/rag/ISourceCitationResolver";
import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";
import type { SourceType } from "../../domain/entities/Document";
import { SourceCitation } from "../../domain/entities/Message";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";

export type { CitationResolution };

/** Enriches raw search results with document metadata (title, sourceType) to build SourceCitation objects. */
export class SourceCitationResolver implements ISourceCitationResolver {
  constructor(private readonly documentRepo: IDocumentRepository) {}

  async resolve(searchResults: ChunkSearchResult[]): Promise<CitationResolution> {
    const uniqueDocIds = [...new Set(searchResults.map((r) => r.chunk.documentId))];
    const docs = await Promise.all(uniqueDocIds.map((id) => this.documentRepo.findById(id)));

    const titleById = new Map(uniqueDocIds.map((id, i) => [id, docs[i]?.title ?? id]));
    const sourceTypeById = new Map<string, SourceType>(
      uniqueDocIds.map((id, i) => [id, docs[i]?.sourceType ?? "text"]),
    );

    const sources = searchResults.map((result) =>
      SourceCitation.create({
        chunkId: result.chunk.id,
        documentId: result.chunk.documentId,
        documentTitle: titleById.get(result.chunk.documentId) ?? result.chunk.documentId,
        sourceType: sourceTypeById.get(result.chunk.documentId) ?? "text",
        excerpt: result.chunk.content,
        score: result.score,
      }),
    );

    return { sources, titleById };
  }
}
