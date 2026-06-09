import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useEffect, useRef } from "react";
import AppLayout from "./components/layout/AppLayout";
import ChatInterface from "./components/chat/ChatInterface";
import DocumentList from "./components/documents/DocumentList";
import DocumentUpload from "./components/documents/DocumentUpload";
import DashboardPage from "./components/pages/DashboardPage";
import SettingsPage from "./components/pages/SettingsPage";
import TechnicalPage from "./components/pages/TechnicalPage";
import PageHeader from "./components/ui/PageHeader";
import { useConversations } from "./hooks/useConversation";
import { FileText, MessageSquare } from "lucide-react";

const queryClient = new QueryClient();

function DocumentsPage() {
  return (
    <div className="p-8">
      <PageHeader
        icon={<FileText className="text-green-600" size={28} />}
        title="Documents"
        info="Manage documents indexed in the knowledge base. Each document is split into chunks, vectorized and stored for semantic search."
      />
      <div className="space-y-6">
        <DocumentUpload />
        <DocumentList />
      </div>
    </div>
  );
}

function ConversationsPage() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();
  const hasActed = useRef(false);

  useEffect(() => {
    if (isLoading || hasActed.current) return;
    hasActed.current = true;
    if (conversations && conversations.length > 0) {
      navigate(`/conversations/${conversations[0].id}`, { replace: true });
    } else if (conversations) {
      navigate("/conversations/new", { replace: true });
    }
  }, [isLoading]);

  return (
    <div className="p-8">
      <PageHeader
        icon={<MessageSquare className="text-blue-500" size={28} />}
        title="Conversations"
        info="Ask questions about your documents. The system retrieves relevant passages and generates a contextual answer."
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="conversations/new" element={<ChatInterface />} />
            <Route path="conversations/:id" element={<ChatInterface />} />
            <Route path="technical" element={<TechnicalPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
