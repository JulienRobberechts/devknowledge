import { useNavigate, useMatch } from "react-router-dom";
import { FileText } from "lucide-react";
import { useDocuments } from "../../hooks/useDocuments";
import DocumentStatusBadge from "./DocumentStatusBadge";
import DocumentTypeIcon from "./DocumentTypeIcon";
import DocumentUpload from "./DocumentUpload";
import PageHeader from "../ui/PageHeader";

export default function DocumentsSidebar() {
  const navigate = useNavigate();
  const match = useMatch("/documents/:id");
  const activeId = match?.params.id;

  const { data: documents } = useDocuments();

  return (
    <div className="flex flex-col h-full p-4">
      <PageHeader
        icon={<FileText className="text-[#d97706]" size={28} />}
        title="Documents"
        info="Manage documents indexed in the knowledge base. Each document is split into chunks, vectorized and stored for semantic search."
      />
      <div className="mb-4">
        <DocumentUpload
          onUploaded={(doc) => navigate(`/documents/${doc.id}`)}
        />
      </div>
      <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
        {documents?.map((doc) => (
          <div
            key={doc.id}
            onClick={() => navigate(`/documents/${doc.id}`)}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer ${
              activeId === doc.id
                ? "bg-amber-50 text-[#92400e] font-medium border border-amber-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DocumentTypeIcon sourceType={doc.sourceType} />
              <span className="truncate">{doc.title}</span>
              <DocumentStatusBadge status={doc.status} />
            </div>
          </div>
        ))}
        {!documents?.length && (
          <p className="text-xs text-slate-400 px-3 py-2">No documents yet.</p>
        )}
      </nav>
    </div>
  );
}
