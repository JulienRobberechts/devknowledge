import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";
import type { SourceCitation } from "../../domain/entities/Message";

export interface CitationResolution {
  sources: SourceCitation[];
  titleById: Map<string, string>;
}

export interface ISourceCitationResolver {
  resolve(searchResults: ChunkSearchResult[]): Promise<CitationResolution>;
}
