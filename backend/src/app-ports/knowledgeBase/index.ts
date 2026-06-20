import type { ICreateDocument } from "./ICreateDocument";
import type { IDeleteDocument } from "./IDeleteDocument";
import type { IIngestDocument } from "./IIngestDocument";
import type { ISummarizeDocument } from "./ISummarizeDocument";
import type { IDocumentQueries } from "./queries/IDocumentQueries";

export type {
  ICreateDocument,
  IDeleteDocument,
  IDocumentQueries,
  IIngestDocument,
  ISummarizeDocument,
};

export interface ArgosKnowledgeBase {
  createDocument: ICreateDocument;
  ingestDocument: IIngestDocument;
  summarizeDocument: ISummarizeDocument;
  deleteDocument: IDeleteDocument;
  documentQueries: IDocumentQueries;
}
