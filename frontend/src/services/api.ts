import type {
  AppConfig,
  Conversation,
  ConversationParams,
  Document,
  DocumentSummary,
  QuizQuestion,
  SourceCitation,
} from "../types/domain";

const API_KEY = import.meta.env.VITE_API_KEY as string;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getDocuments: () => request<Document[]>("/documents"),
  getDocument: (id: string) => request<Document>(`/documents/${id}`),
  uploadDocument: (file: File, title?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (title) fd.append("title", title);
    return request<{ id: string; status: string }>("/documents", {
      method: "POST",
      body: fd,
    });
  },
  getDocumentContent: (id: string) =>
    request<{ content: string; sourceType: string }>(
      `/documents/${id}/content`,
    ),
  getDocumentRaw: async (id: string): Promise<ArrayBuffer> => {
    const res = await fetch(`/api/documents/${id}/raw`, {
      headers: { "x-api-key": API_KEY },
    });
    if (!res.ok) throw new Error("Raw file not available");
    return res.arrayBuffer();
  },
  getDocumentChunks: (id: string) =>
    request<{ position: number; contentLength: number; preview: string }[]>(
      `/documents/${id}/chunks`,
    ),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),
  getDocumentSummary: (id: string) =>
    request<DocumentSummary>(`/documents/${id}/summary`),
  generateDocumentSummary: (id: string) =>
    request<{ content: string }>(`/documents/${id}/summary`, {
      method: "POST",
    }),

  getConversations: () => request<Conversation[]>("/conversations"),
  getConversation: (id: string) =>
    request<Conversation>(`/conversations/${id}`),
  createConversation: (params?: Partial<ConversationParams>, title?: string) =>
    request<Conversation>("/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title ?? "New conversation", params }),
    }),
  deleteConversation: (id: string) =>
    request<void>(`/conversations/${id}`, { method: "DELETE" }),

  search: (query: string, limit?: number) =>
    request<SourceCitation[]>("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    }),

  updateConversationTitle: (id: string, title: string) =>
    request<Conversation>(`/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),

  getConfig: () => request<AppConfig>("/config"),

  generateQuiz: (documentIds: string[], questionCount: number) =>
    request<{ questions: QuizQuestion[] }>("/quizzes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds, questionCount }),
    }),
};
