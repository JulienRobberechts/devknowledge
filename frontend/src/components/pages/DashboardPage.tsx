import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  Database,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../ui/PageHeader";
import { useDocuments } from "../../hooks/useDocuments";
import { useConversations } from "../../hooks/useConversation";
import { useConfig } from "../../hooks/useConfig";
import type { Document, Conversation } from "../../types/domain";

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DocumentStatusBar({ documents }: { documents: Document[] }) {
  const ready = documents.filter((d) => d.status === "ready").length;
  const processing = documents.filter((d) => d.status === "processing").length;
  const pending = documents.filter((d) => d.status === "pending").length;
  const error = documents.filter((d) => d.status === "error").length;
  const total = documents.length;

  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
        {ready > 0 && (
          <div
            className="bg-green-400 transition-all"
            style={{ width: `${(ready / total) * 100}%` }}
          />
        )}
        {processing > 0 && (
          <div
            className="bg-blue-400 animate-pulse"
            style={{ width: `${(processing / total) * 100}%` }}
          />
        )}
        {pending > 0 && (
          <div
            className="bg-yellow-300"
            style={{ width: `${(pending / total) * 100}%` }}
          />
        )}
        {error > 0 && (
          <div
            className="bg-red-400"
            style={{ width: `${(error / total) * 100}%` }}
          />
        )}
      </div>
      <div className="flex gap-4 text-xs text-gray-500">
        {ready > 0 && (
          <span className="flex items-center gap-1">
            <CheckCircle size={11} className="text-green-500" />
            {ready} ready
          </span>
        )}
        {processing > 0 && (
          <span className="flex items-center gap-1">
            <Loader2 size={11} className="text-blue-500 animate-spin" />
            {processing} processing
          </span>
        )}
        {pending > 0 && (
          <span className="flex items-center gap-1">
            <Clock size={11} className="text-yellow-500" />
            {pending} pending
          </span>
        )}
        {error > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle size={11} className="text-red-500" />
            {error} error{error > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function RecentDocuments({ documents }: { documents: Document[] }) {
  const recent = [...documents]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const statusIcon = {
    ready: <CheckCircle size={14} className="text-green-500 shrink-0" />,
    processing: (
      <Loader2 size={14} className="text-blue-500 animate-spin shrink-0" />
    ),
    pending: <Clock size={14} className="text-yellow-500 shrink-0" />,
    error: <AlertCircle size={14} className="text-red-500 shrink-0" />,
  };

  const typeLabel: Record<string, string> = {
    pdf: "PDF",
    markdown: "MD",
    text: "TXT",
  };

  return (
    <div className="space-y-2">
      {recent.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {statusIcon[doc.status]}
          <span className="flex-1 text-sm text-gray-700 truncate">
            {doc.title}
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
            {typeLabel[doc.sourceType] ?? doc.sourceType}
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentConversations({
  conversations,
}: {
  conversations: Conversation[];
}) {
  const recent = [...conversations]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {recent.map((conv) => {
        const msgCount = conv.messages?.length ?? 0;
        return (
          <Link
            key={conv.id}
            to={`/conversations/${conv.id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
          >
            <MessageSquare size={14} className="text-blue-400 shrink-0" />
            <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-blue-700">
              {conv.title}
            </span>
            <span className="text-xs text-gray-400">
              {msgCount} msg{msgCount > 1 ? "s" : ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function RagConfigCard({
  config,
}: {
  config: {
    chunkSize: number;
    chunkOverlap: number;
    retrievalLimit: number;
    retrievalMinScore: number;
  };
}) {
  const items = [
    { label: "Chunk size", value: `${config.chunkSize} tokens` },
    { label: "Overlap", value: `${config.chunkOverlap} tokens` },
    { label: "Results retrieved", value: config.retrievalLimit },
    { label: "Minimum score", value: config.retrievalMinScore.toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-semibold text-gray-700">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { data: conversations = [], isLoading: convsLoading } =
    useConversations();
  const { data: config, isLoading: configLoading } = useConfig();

  const readyDocs = documents.filter((d) => d.status === "ready").length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + (c.messages?.length ?? 0),
    0,
  );

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        icon={<LayoutDashboard className="text-blue-600" size={28} />}
        title="Argos"
        info="Overview of the knowledge base: indexed documents, recent conversations and RAG system status."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Indexed documents"
          value={docsLoading ? "…" : readyDocs}
          icon={<FileText size={20} className="text-green-600" />}
          color="bg-green-50"
          sub={docsLoading ? undefined : `of ${documents.length} total`}
        />
        <StatCard
          label="Conversations"
          value={convsLoading ? "…" : conversations.length}
          icon={<MessageSquare size={20} className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          label="Messages exchanged"
          value={convsLoading ? "…" : totalMessages}
          icon={<TrendingUp size={20} className="text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          label="RAG Pipeline"
          value={configLoading ? "…" : "Active"}
          icon={<Zap size={20} className="text-orange-500" />}
          color="bg-orange-50"
          sub={config ? config.rag.chunkingStrategy : undefined}
        />
      </div>

      {/* Documents + Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-green-500" />
              <h2 className="font-semibold text-gray-700 text-sm">
                Recent documents
              </h2>
            </div>
            <Link
              to="/documents"
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {docsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-6">
              <FileText size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No documents</p>
              <Link
                to="/documents"
                className="mt-2 inline-block text-xs text-blue-500 hover:underline"
              >
                Import a document →
              </Link>
            </div>
          ) : (
            <>
              <DocumentStatusBar documents={documents} />
              <RecentDocuments documents={documents} />
            </>
          )}
        </div>

        {/* Conversations panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-700 text-sm">
                Recent conversations
              </h2>
            </div>
            <Link
              to="/conversations"
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {convsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No conversations</p>
              <Link
                to="/conversations/new"
                className="mt-2 inline-block text-xs text-blue-500 hover:underline"
              >
                Start a conversation →
              </Link>
            </div>
          ) : (
            <RecentConversations conversations={conversations} />
          )}
        </div>
      </div>

      {/* RAG Config */}
      {config && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-orange-400" />
              <h2 className="font-semibold text-gray-700 text-sm">
                Active RAG configuration
              </h2>
            </div>
            <Link
              to="/settings"
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              Edit <ArrowRight size={12} />
            </Link>
          </div>
          <RagConfigCard config={config.rag} />
        </div>
      )}
    </div>
  );
}
