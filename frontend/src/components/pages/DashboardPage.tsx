import {
  FileText,
  MessageSquare,
  TrendingUp,
  Database,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDocuments } from "../../hooks/useDocuments";
import { useConversations } from "../../hooks/useConversation";
import { useConfig } from "../../hooks/useConfig";
import {
  StatCard,
  DocumentStatusBar,
  RecentDocuments,
  RecentConversations,
  RagConfigCard,
} from "./DashboardWidgets";

export default function DashboardPage() {
  const { data: documents = [], isLoading: docsLoading } = useDocuments();
  const { data: conversations = [], isLoading: convsLoading } =
    useConversations();
  const { data: config, isLoading: configLoading } = useConfig();

  const readyDocs = documents.filter((d) => d.status === "ready").length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + (c.messageCount ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden px-8 py-10"
        style={{
          background:
            "linear-gradient(135deg, #111827 0%, #1f2937 60%, #374151 100%)",
        }}
      >
        {/* Glow circle behind logo */}
        <div
          className="absolute left-8 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "#d97706" }}
        />
        <div className="relative flex items-center gap-8">
          <div
            className="relative h-32 w-32 rounded-full shrink-0 border-[6px] border-[#d97706] bg-white overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(217,119,6,0.25)" }}
          >
            <img
              src="/logo-argos-1.jpg"
              alt="Argos"
              className="h-full w-full object-contain"
            />
            <div
              className="absolute inset-0"
              style={{ background: "#374151", mixBlendMode: "color" }}
            />
          </div>
          <div
            style={{
              display: "inline-grid",
              gridTemplateColumns: "max-content",
            }}
          >
            <h1
              style={{
                fontFamily: "'Audiowide', sans-serif",
                fontWeight: 400,
                fontSize: "2.75rem",
                lineHeight: 1,
                display: "flex",
                justifyContent: "space-between",
                background:
                  "linear-gradient(90deg, #92400e 0%, #d97706 40%, #fcd34d 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              {"ARGOS".split("").map((char, i) => (
                <span key={i}>{char}</span>
              ))}
            </h1>
            <p
              className="text-sm font-medium"
              style={{
                textAlign: "justify",
                textAlignLast: "justify",
                background:
                  "linear-gradient(90deg, #92400e 0%, #d97706 40%, #fcd34d 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              Knowledge Intelligence Platform
            </p>
            <p className="mt-3 text-xs italic text-slate-400">
              Turn your documents into an intelligent,
            </p>
            <p className="text-xs italic text-slate-400">
              conversational knowledge base.
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 space-y-8 pb-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Indexed documents"
            value={docsLoading ? "…" : readyDocs}
            icon={<FileText size={20} className="text-[#d97706]" />}
            color="bg-amber-50"
            border="border-amber-100"
            sub={docsLoading ? undefined : `of ${documents.length} total`}
          />
          <StatCard
            label="Conversations"
            value={convsLoading ? "…" : conversations.length}
            icon={<MessageSquare size={20} className="text-[#d97706]" />}
            color="bg-amber-50"
            border="border-amber-100"
          />
          <StatCard
            label="Messages exchanged"
            value={convsLoading ? "…" : totalMessages}
            icon={<TrendingUp size={20} className="text-[#d97706]" />}
            color="bg-amber-50"
            border="border-amber-100"
          />
          <StatCard
            label="RAG Pipeline"
            value={configLoading ? "…" : "Active"}
            icon={<Zap size={20} className="text-[#d97706]" />}
            color="bg-amber-50"
            border="border-amber-100"
            sub={config ? config.rag.chunkingStrategy : undefined}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Recent documents
                </h2>
              </div>
              <Link
                to="/documents"
                className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {docsLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : documents.length === 0 ? (
              <div className="text-center py-6">
                <FileText size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No documents</p>
                <Link
                  to="/documents"
                  className="mt-2 inline-block text-xs text-amber-600 hover:underline"
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Recent conversations
                </h2>
              </div>
              <Link
                to="/conversations"
                className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {convsLoading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare
                  size={32}
                  className="text-slate-200 mx-auto mb-2"
                />
                <p className="text-sm text-slate-400">No conversations</p>
                <Link
                  to="/conversations/new"
                  className="mt-2 inline-block text-xs text-amber-600 hover:underline"
                >
                  Start a conversation →
                </Link>
              </div>
            ) : (
              <RecentConversations conversations={conversations} />
            )}
          </div>
        </div>

        {config && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  Active RAG configuration
                </h2>
              </div>
              <Link
                to="/settings"
                className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium"
              >
                Edit <ArrowRight size={12} />
              </Link>
            </div>
            <RagConfigCard config={config.rag} />
          </div>
        )}
      </div>
    </div>
  );
}
