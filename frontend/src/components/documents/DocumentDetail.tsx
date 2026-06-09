import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { api } from "../../services/api";
import { useDeleteDocument, useDocumentChunks } from "../../hooks/useDocuments";
import DocumentStatusBadge from "./DocumentStatusBadge";

const sourceTypeLabel: Record<string, string> = {
  pdf: "PDF",
  markdown: "Markdown",
  text: "Text",
};

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();

  const { data: doc, isLoading } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.getDocument(id!),
    enabled: !!id,
  });

  const { data: chunks } = useDocumentChunks(
    doc?.status === "ready" ? id : undefined,
  );
  const charCount = chunks?.reduce((sum, c) => sum + c.contentLength, 0);
  const chunkCount = chunks?.length;

  const [showContent, setShowContent] = useState(false);
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["documents", id, "content"],
    queryFn: () => api.getDocumentContent(id!),
    enabled: !!id && showContent && doc?.status === "ready",
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-500">Loading document...</div>;
  }

  if (!doc) {
    return <div className="p-8 text-sm text-gray-500">Document not found.</div>;
  }

  async function handleDelete() {
    await deleteDocument.mutateAsync(doc!.id);
    navigate("/documents");
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{doc.title}</h2>
        <DocumentStatusBadge status={doc.status} />
      </div>

      <dl className="space-y-4">
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            Type
          </dt>
          <dd className="text-sm text-gray-800">
            {sourceTypeLabel[doc.sourceType] ?? doc.sourceType}
          </dd>
        </div>
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            Status
          </dt>
          <dd className="text-sm text-gray-800">
            <DocumentStatusBadge status={doc.status} />
          </dd>
        </div>
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            ID
          </dt>
          <dd className="text-sm text-gray-800 font-mono break-all">
            {doc.id}
          </dd>
        </div>
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            Added
          </dt>
          <dd className="text-sm text-gray-800">
            {new Date(doc.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </dd>
        </div>
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            Characters
          </dt>
          <dd className="text-sm text-gray-800">
            {charCount !== undefined ? charCount.toLocaleString() : "—"}
          </dd>
        </div>
        <div className="flex gap-4 py-3 border-t border-gray-100">
          <dt className="w-32 text-sm font-medium text-gray-500 shrink-0">
            Chunks
          </dt>
          <dd className="text-sm text-gray-800">
            {chunkCount !== undefined ? chunkCount : "—"}
          </dd>
        </div>
      </dl>

      {doc.status === "ready" && doc.sourceType === "markdown" && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setShowContent((v) => !v)}
            className="mb-4 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            {showContent ? "Hide content" : "View document"}
          </button>
          {showContent && (
            <div className="rounded-md border border-gray-200 bg-white p-6 prose prose-sm max-w-none">
              {contentLoading && (
                <p className="text-sm text-gray-400">Loading…</p>
              )}
              {contentData && (
                <ReactMarkdown>{contentData.content}</ReactMarkdown>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={() => void handleDelete()}
          disabled={deleteDocument.isPending}
          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          {deleteDocument.isPending ? "Deleting..." : "Delete document"}
        </button>
      </div>
    </div>
  );
}
