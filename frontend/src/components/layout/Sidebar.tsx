import { Link, useMatch, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import {
  useConversations,
  useDeleteConversation,
} from "../../hooks/useConversation";
import PageHeader from "../ui/PageHeader";

export default function Sidebar() {
  const navigate = useNavigate();
  const match = useMatch("/conversations/:id");
  const activeId = match?.params.id;

  const { data: conversations } = useConversations();
  const deleteConversation = useDeleteConversation();

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation.mutateAsync(id);
    if (activeId === id) {
      const remaining = conversations?.filter((c) => c.id !== id);
      if (remaining && remaining.length > 0) {
        navigate(`/conversations/${remaining[0].id}`);
      } else {
        navigate("/conversations/new");
      }
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <PageHeader
        icon={<MessageSquare className="text-[#d97706]" size={28} />}
        title="Conversations"
        info="Ask questions about your documents. The system retrieves relevant passages and generates a contextual answer."
      />
      <button
        onClick={() => navigate("/conversations/new")}
        className="w-full mb-4 px-3 py-2 bg-[#1f2937] text-white rounded-lg text-sm font-medium hover:bg-[#374151] transition-colors"
      >
        + New conversation
      </button>
      <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
        {conversations?.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
              activeId === conv.id
                ? "bg-amber-50 text-[#92400e] font-medium border border-amber-200"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Link
              to={`/conversations/${conv.id}`}
              className="flex-1 flex items-center gap-2 truncate"
            >
              <MessageSquare size={14} className="shrink-0 opacity-50" />
              <span className="truncate">{conv.title}</span>
            </Link>
            <button
              onClick={(e) => void handleDelete(e, conv.id)}
              className="hidden group-hover:block ml-2 text-slate-300 hover:text-red-400"
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
