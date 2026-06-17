import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import {
  useDeleteDocument,
  useDocumentChunks,
  useDocumentSummary,
  useGenerateDocumentSummary,
} from "../../hooks/useDocuments";
import { api } from "../../services/api";
import DocumentStatusBadge from "./DocumentStatusBadge";
import DocumentTypeIcon from "./DocumentTypeIcon";
import MarkdownViewer from "./MarkdownViewer";
import PdfViewer from "./PdfViewer";
import TextViewer from "./TextViewer";

const sourceTypeLabel: Record<string, string> = {
  pdf: "PDF",
  markdown: "Markdown",
  text: "Text",
};

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SummaryTab({ id }: { id: string }) {
  const { data: summary, isLoading: summaryLoading } = useDocumentSummary(id);
  const generateSummary = useGenerateDocumentSummary();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {summary && (
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white">
          <p className="text-xs text-slate-400">
            {summary.content.length.toLocaleString()} characters
          </p>
          <button
            type="button"
            onClick={() => generateSummary.mutate(id)}
            disabled={generateSummary.isPending}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {generateSummary.isPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
        {summaryLoading && <p className="text-sm text-slate-400">Loading…</p>}
        {!summaryLoading && !summary && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-slate-500">No summary yet.</p>
            <button
              type="button"
              onClick={() => generateSummary.mutate(id)}
              disabled={generateSummary.isPending}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {generateSummary.isPending ? "Generating…" : "Generate summary"}
            </button>
          </div>
        )}
        {summary && (
          <div className="prose prose-sm max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
            <ReactMarkdown>{summary.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();
  const [tab, setTab] = useState<"document" | "details" | "summary">(
    "document",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.getDocument(id as string),
    enabled: !!id,
  });

  const { data: chunks } = useDocumentChunks(
    doc?.status === "ready" ? id : undefined,
  );
  const charCount = chunks?.reduce((sum, c) => sum + c.contentLength, 0);
  const chunkCount = chunks?.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-slate-400">Document not found.</p>
      </div>
    );
  }

  const canPreview =
    doc.status === "ready" &&
    (doc.sourceType === "pdf" ||
      doc.sourceType === "markdown" ||
      doc.sourceType === "text");

  const docId = doc.id;
  async function handleDelete() {
    await deleteDocument.mutateAsync(docId);
    navigate("/documents");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">
              <DocumentTypeIcon sourceType={doc.sourceType} size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 leading-snug truncate">
                {doc.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">
                  {sourceTypeLabel[doc.sourceType] ?? doc.sourceType}
                </span>
                <span className="text-slate-300">·</span>
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className="text-xs text-slate-500">Delete?</span>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteDocument.isPending}
                className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteDocument.isPending ? "…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 ml-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Delete document"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        <div className="flex">
          {canPreview && (
            <button
              type="button"
              onClick={() => setTab("document")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab === "document" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              Document
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab("details")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab === "details" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Details
          </button>
          {doc.status === "ready" && (
            <button
              type="button"
              onClick={() => setTab("summary")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab === "summary" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              Summary
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "document" && canPreview && (
          <>
            {doc.sourceType === "pdf" && <PdfViewer id={id as string} />}
            {doc.sourceType === "markdown" && (
              <MarkdownViewer id={id as string} />
            )}
            {doc.sourceType === "text" && <TextViewer id={id as string} />}
          </>
        )}

        {tab === "summary" && <SummaryTab id={id as string} />}

        {tab === "details" && (
          <div className="h-full overflow-y-auto p-6">
            {doc.status === "ready" && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                    Characters
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {charCount !== undefined ? charCount.toLocaleString() : "—"}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                    Chunks
                  </p>
                  <p className="text-xl font-semibold text-slate-900">
                    {chunkCount !== undefined ? chunkCount : "—"}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Information
                </h3>
              </div>
              <dl>
                <div className="flex items-center px-4 py-3 border-b border-slate-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-slate-500 shrink-0">
                    Type
                  </dt>
                  <dd className="text-xs text-slate-800">
                    {sourceTypeLabel[doc.sourceType] ?? doc.sourceType}
                  </dd>
                </div>
                <div className="flex items-center px-4 py-3 border-b border-slate-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-slate-500 shrink-0">
                    Status
                  </dt>
                  <dd>
                    <DocumentStatusBadge status={doc.status} />
                  </dd>
                </div>
                <div className="flex items-start px-4 py-3 border-b border-slate-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-slate-500 shrink-0 mt-0.5">
                    ID
                  </dt>
                  <dd className="text-xs text-slate-500 font-mono break-all">
                    {doc.id}
                  </dd>
                </div>
                <div className="flex items-center px-4 py-3 last:border-0">
                  <dt className="w-28 text-xs font-medium text-slate-500 shrink-0">
                    Added on
                  </dt>
                  <dd className="text-xs text-slate-800">
                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
