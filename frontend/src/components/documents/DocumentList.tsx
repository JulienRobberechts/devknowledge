import { useDeleteDocument, useDocuments } from "../../hooks/useDocuments";
import DocumentStatusBadge from "./DocumentStatusBadge";

export default function DocumentList() {
  const { data: documents, isLoading } = useDocuments();
  const deleteDocument = useDeleteDocument();

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading documents...</div>;
  }

  if (!documents?.length) {
    return (
      <div className="text-sm text-gray-500">
        No documents yet. Upload one to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium text-gray-800 truncate">
              {doc.title}
            </span>
            <DocumentStatusBadge status={doc.status} />
          </div>
          <button
            onClick={() => deleteDocument.mutate(doc.id)}
            disabled={deleteDocument.isPending}
            className="ml-3 text-sm text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
