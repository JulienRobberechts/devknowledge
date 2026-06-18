import type { IAppSettingsService } from "./IAppSettingsService";
import type { IAskQuestion } from "./IAskQuestion";
import type { ICheckStorageConsistency } from "./ICheckStorageConsistency";
import type { IConversationTitleGenerator } from "./IConversationTitleGenerator";
import type { ICreateDocument } from "./ICreateDocument";
import type { IGenerateQuiz } from "./IGenerateQuiz";
import type { IIngestDocument } from "./IIngestDocument";
import type { IResetAll } from "./IResetAll";
import type { IRetrieveKnowledge } from "./IRetrieveKnowledge";
import type { ISourceCitationResolver } from "./ISourceCitationResolver";
import type { ISummarizeDocument } from "./ISummarizeDocument";

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
