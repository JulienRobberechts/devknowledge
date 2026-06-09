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
      className="h-full overflow-y-auto bg-gray-100 p-6 flex flex-col items-center"
    >
      {isLoading && <p className="text-sm text-gray-400 mt-8">Chargement…</p>}
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

function MarkdownViewer({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["documents", id, "content"],
    queryFn: () => api.getDocumentContent(id),
  });

  return (
    <div className="h-full overflow-y-auto p-8">
      {isLoading && <p className="text-sm text-gray-400">Chargement…</p>}
      {data && (
        <div className="prose prose-sm max-w-3xl mx-auto">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const deleteDocument = useDeleteDocument();
  const [tab, setTab] = useState<"document" | "details">("document");

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
    return <div className="p-8 text-sm text-gray-500">Loading document...</div>;
  }
  if (!doc) {
    return <div className="p-8 text-sm text-gray-500">Document not found.</div>;
  }

  const canPreview =
    doc.status === "ready" &&
    (doc.sourceType === "pdf" || doc.sourceType === "markdown");

  async function handleDelete() {
    await deleteDocument.mutateAsync(doc!.id);
    navigate("/documents");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 pt-5 pb-0">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          {doc.title}
        </h2>
        <div className="flex">
          {canPreview && (
            <button
              onClick={() => setTab("document")}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "details"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Détails
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "document" && canPreview && (
          <>
            {doc.sourceType === "pdf" && <PdfViewer id={id!} />}
            {doc.sourceType === "markdown" && <MarkdownViewer id={id!} />}
          </>
        )}
        {tab === "details" && (
          <div className="h-full overflow-y-auto p-8 max-w-2xl">
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
        )}
      </div>
    </div>
  );
}
