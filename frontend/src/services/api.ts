import type {
  AppConfig,
  AppSettings,
  AppSettingsPatch,
  ConsistencyReport,
  Conversation,
  ConversationParams,
  Document,
  DocumentSummary,
  QuizQuestion,
  SourceCitation,
} from "../types/domain";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorized = cb;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 401) {
    onUnauthorized?.();
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  login: (password: string) =>
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    }),

  logout: () =>
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }),

  checkAuth: () =>
    fetch("/api/auth/me", { credentials: "include" }).then((r) => r.ok),

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
      credentials: "include",
    });
    if (res.status === 401) {
      onUnauthorized?.();
      throw new UnauthorizedError();
    }
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

  checkStorageConsistency: () =>
    request<ConsistencyReport>("/admin/storage/consistency"),

  getSettings: () => request<AppSettings>("/admin/settings"),

  updateSettings: (patch: AppSettingsPatch) =>
    request<AppSettings>("/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),

  resetAll: (newSettings?: AppSettingsPatch) =>
    request<void>("/admin/reset", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newSettings }),
    }),
};
