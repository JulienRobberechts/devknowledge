import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { api } from "../../services/api";
import { useDeleteDocument, useDocumentChunks } from "../../hooks/useDocuments";
import DocumentStatusBadge from "./DocumentStatusBadge";
import DocumentTypeIcon from "./DocumentTypeIcon";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const sourceTypeLabel: Record<string, string> = {
  pdf: "PDF",
  markdown: "Markdown",
  text: "Text",
};

function PdfViewer({ id }: { id: string }) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data: pdfData, isLoading } = useQuery({
    queryKey: ["documents", id, "raw"],
    queryFn: () => api.getDocumentRaw(id),
    gcTime: 0,
  });

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-gray-50 p-6 flex flex-col items-center"
    >
      {isLoading && <p className="text-sm text-gray-400 mt-8">Loading…</p>}
      {pdfData && (
        <Document
          file={pdfData}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="mb-4 shadow-md">
              <Page pageNumber={i + 1} width={Math.max(width - 48, 200)} />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}

function TextViewer({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["documents", id, "content"],
    queryFn: () => api.getDocumentContent(id),
  });

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {data && (
        <pre className="max-w-3xl mx-auto text-sm text-gray-800 font-mono whitespace-pre-wrap break-words leading-relaxed bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {data.content}
        </pre>
      )}
    </div>
  );
}

function MarkdownViewer({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["documents", id, "content"],
    queryFn: () => api.getDocumentContent(id),
  });

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-8">
      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {data && (
        <div className="prose prose-sm max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

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
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();
  const [tab, setTab] = useState<"document" | "details">("document");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">Document not found.</p>
      </div>
    );
  }

  const canPreview =
    doc.status === "ready" &&
    (doc.sourceType === "pdf" ||
      doc.sourceType === "markdown" ||
      doc.sourceType === "text");

  async function handleDelete() {
    await deleteDocument.mutateAsync(doc!.id);
    navigate("/documents");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 pt-5 pb-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">
              <DocumentTypeIcon sourceType={doc.sourceType} size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900 leading-snug truncate">
                {doc.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {sourceTypeLabel[doc.sourceType] ?? doc.sourceType}
                </span>
                <span className="text-gray-300">·</span>
                <DocumentStatusBadge status={doc.status} />
              </div>
            </div>
          </div>

          {/* Delete action */}
          {confirmDelete ? (
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className="text-xs text-gray-500">Delete?</span>
              <button
                onClick={() => void handleDelete()}
                disabled={deleteDocument.isPending}
                className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteDocument.isPending ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 ml-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Delete document"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          {canPreview && (
            <button
              onClick={() => setTab("document")}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                tab === "document"
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Document
            </button>
          )}
          <button
            onClick={() => setTab("details")}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              tab === "details"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Details
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "document" && canPreview && (
          <>
            {doc.sourceType === "pdf" && <PdfViewer id={id!} />}
            {doc.sourceType === "markdown" && <MarkdownViewer id={id!} />}
            {doc.sourceType === "text" && <TextViewer id={id!} />}
          </>
        )}

        {tab === "details" && (
          <div className="h-full overflow-y-auto p-6">
            {/* Stats cards */}
            {doc.status === "ready" && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Characters
                  </p>
                  <p className="text-xl font-semibold text-gray-900">
                    {charCount !== undefined ? charCount.toLocaleString() : "—"}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Chunks
                  </p>
                  <p className="text-xl font-semibold text-gray-900">
                    {chunkCount !== undefined ? chunkCount : "—"}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Information
                </h3>
              </div>
              <dl>
                <div className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-gray-500 shrink-0">
                    Type
                  </dt>
                  <dd className="text-xs text-gray-800">
                    {sourceTypeLabel[doc.sourceType] ?? doc.sourceType}
                  </dd>
                </div>
                <div className="flex items-center px-4 py-3 border-b border-gray-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-gray-500 shrink-0">
                    Status
                  </dt>
                  <dd>
                    <DocumentStatusBadge status={doc.status} />
                  </dd>
                </div>
                <div className="flex items-start px-4 py-3 border-b border-gray-100 last:border-0">
                  <dt className="w-28 text-xs font-medium text-gray-500 shrink-0 mt-0.5">
                    ID
                  </dt>
                  <dd className="text-xs text-gray-500 font-mono break-all">
                    {doc.id}
                  </dd>
                </div>
                <div className="flex items-center px-4 py-3 last:border-0">
                  <dt className="w-28 text-xs font-medium text-gray-500 shrink-0">
                    Added on
                  </dt>
                  <dd className="text-xs text-gray-800">
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
