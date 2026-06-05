import { Link, useMatch, useNavigate } from "react-router-dom";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from "../../hooks/useConversation";

export default function Sidebar() {
  const navigate = useNavigate();
  const match = useMatch("/conversations/:id");
  const activeId = match?.params.id;

  const { data: conversations } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();

  async function handleNew() {
    const conv = await createConversation.mutateAsync();
    navigate(`/conversations/${conv.id}`);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation.mutateAsync(id);
    if (activeId === id) navigate("/documents");
  }

  return (
    <div className="flex flex-col h-full p-3">
      <div className="mb-4">
        <Link to="/documents" className="font-bold text-lg text-gray-800">
          DevKnowledge
        </Link>
      </div>
      <button
        onClick={() => void handleNew()}
        disabled={createConversation.isPending}
        className="w-full mb-4 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        + New conversation
      </button>
      <nav className="flex flex-col gap-1 overflow-y-auto flex-1">
        {conversations?.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm ${
              activeId === conv.id
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Link to={`/conversations/${conv.id}`} className="flex-1 truncate">
              {conv.title}
            </Link>
            <button
              onClick={(e) => void handleDelete(e, conv.id)}
              className="hidden group-hover:block ml-2 text-gray-400 hover:text-red-500"
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}
