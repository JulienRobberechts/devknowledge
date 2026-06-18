import type { IAppSettingsService } from "./admin/IAppSettingsService";
import type { IAskQuestion } from "./rag/IAskQuestion";
import type { ICheckStorageConsistency } from "./admin/ICheckStorageConsistency";
import type { IConversationTitleGenerator } from "./rag/IConversationTitleGenerator";
import type { ICreateDocument } from "./knowledgeBase/ICreateDocument";
import type { IGenerateQuiz } from "./quiz/IGenerateQuiz";
import type { IIngestDocument } from "./knowledgeBase/IIngestDocument";
import type { IResetAll } from "./admin/IResetAll";
import type { IRetrieveKnowledge } from "./rag/IRetrieveKnowledge";
import type { ISourceCitationResolver } from "./rag/ISourceCitationResolver";
import type { ISummarizeDocument } from "./knowledgeBase/ISummarizeDocument";

export interface Argos {
  settingsService: IAppSettingsService;
  askQuestion: IAskQuestion;
  checkStorageConsistency: ICheckStorageConsistency;
  conversationTitleGenerator: IConversationTitleGenerator;
  createDocument: ICreateDocument;
  generateQuiz: IGenerateQuiz;
  ingestDocument: IIngestDocument;
  resetAll: IResetAll;
  retrieveKnowledge: IRetrieveKnowledge;
  sourceCitationResolver: ISourceCitationResolver;
  summarizeDocument: ISummarizeDocument;
}
