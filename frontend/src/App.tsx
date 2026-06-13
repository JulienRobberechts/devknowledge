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
import DocumentDetail from "./components/documents/DocumentDetail";
import DocumentUpload from "./components/documents/DocumentUpload";
import DashboardPage from "./components/pages/DashboardPage";
import QuizPage from "./components/pages/QuizPage";
import SettingsPage from "./components/pages/SettingsPage";
import TechnicalPage from "./features/technical/TechnicalPage";
import TechnicalLayout from "./features/technical/TechnicalLayout";
import RerankingPage from "./features/technical/RerankingPage";
import LLMModelsPage from "./features/technical/LLMModelsPage";
import KnowledgeCheckPage from "./features/technical/KnowledgeCheckPage";
import HybridSearchPage from "./features/technical/HybridSearchPage";
import EvaluationPage from "./features/technical/EvaluationPage";
import RagPipelinePage from "./features/technical/RagPipelinePage";
import FontPreviewPage from "./components/pages/FontPreviewPage";
import ColorPalettePage from "./components/pages/ColorPalettePage";
import { useConversations } from "./hooks/useConversation";
import { MessageSquare } from "lucide-react";
import PageHeader from "./components/ui/PageHeader";

const queryClient = new QueryClient();

function DocumentsEmptyPage() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <DocumentUpload />
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
        icon={<MessageSquare className="text-amber-500" size={28} />}
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
            <Route path="documents" element={<DocumentsEmptyPage />} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="conversations/new" element={<ChatInterface />} />
            <Route path="conversations/:id" element={<ChatInterface />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="technical" element={<TechnicalLayout />}>
              <Route index element={<TechnicalPage />} />
              <Route path="rag-pipeline" element={<RagPipelinePage />} />
              <Route path="hybrid-search" element={<HybridSearchPage />} />
              <Route path="reranking" element={<RerankingPage />} />
              <Route path="llm-models" element={<LLMModelsPage />} />
              <Route path="knowledge-check" element={<KnowledgeCheckPage />} />
              <Route path="evaluation" element={<EvaluationPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="font-preview" element={<FontPreviewPage />} />
            <Route path="color-palette" element={<ColorPalettePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
