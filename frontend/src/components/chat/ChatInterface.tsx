import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useConversation,
  useCreateConversation,
} from "../../hooks/useConversation";
import { useSSEStream } from "../../hooks/useSSEStream";
import { useConfig } from "../../hooks/useConfig";
import MessageList from "./MessageList";
import ParamsPanel from "./ParamsPanel";
import EditableTitle from "./EditableTitle";
import ChatInputForm from "./ChatInputForm";
import { useState, useRef, useEffect } from "react";
import { Settings2 } from "lucide-react";
import type { ConversationParams } from "../../types/domain";

export default function ChatInterface() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation();
  const { data: conversation, isLoading } = useConversation(id ?? null);
  const { data: appConfig } = useConfig();
  const [input, setInput] = useState("");
  const [showParams, setShowParams] = useState(false);
  const [pendingParams, setPendingParams] = useState<
    Partial<ConversationParams>
  >({});
  const stream = useSSEStream(id ?? "");
  const pendingSentRef = useRef(false);

  useEffect(() => {
    if (appConfig && Object.keys(pendingParams).length === 0) {
      setPendingParams({
        retrievalLimit: appConfig.rag.retrievalLimit,
        retrievalMinScore: appConfig.rag.retrievalMinScore,
        rerankEnabled: appConfig.rag.reranking.enabled,
        rerankModel: appConfig.rag.reranking.model,
        rerankCandidateMultiplier: 3,
        llmModel: appConfig.llm.model,
        llmTemperature: appConfig.llm.temperature,
        llmMaxTokens: appConfig.llm.maxTokens,
        knowledgeCheckStrategies: [],
        searchMode: appConfig.rag.searchMode,
      });
    }
  }, [appConfig]);

  useEffect(() => {
    const pending = (location.state as { pendingMessage?: string } | null)
      ?.pendingMessage;
    if (!pending || !id || pendingSentRef.current) return;
    pendingSentRef.current = true;
    navigate(location.pathname, { replace: true, state: {} });
    stream.send(pending, () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [id]);

  async function submitNew(content: string) {
    const conv = await createConversation.mutateAsync(pendingParams);
    navigate(`/conversations/${conv.id}`, {
      replace: true,
      state: { pendingMessage: content },
    });
  }

  function submit() {
    const content = input.trim();
    if (!content || stream.isStreaming) return;
    setInput("");
    if (!id) {
      void submitNew(content);
      return;
    }
    stream.send(content, () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }

  const settingsButton = (
    <button
      onClick={() => setShowParams((v) => !v)}
      title={showParams ? "Hide settings" : "Show settings"}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
        showParams
          ? "border-indigo-300 bg-indigo-50 text-indigo-600"
          : "border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <Settings2 className="w-3.5 h-3.5" />
      Settings
    </button>
  );

  if (!id) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-gray-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">
              New conversation
            </span>
            {settingsButton}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
            <p className="text-gray-400 text-sm">
              Ask anything about your knowledge base
            </p>
            <div className="w-full max-w-2xl">
              <ChatInputForm
                input={input}
                setInput={setInput}
                onSubmit={submit}
                disabled={createConversation.isPending}
              />
            </div>
          </div>
        </div>
        {showParams && (
          <aside className="w-72 border-l border-gray-200 shrink-0 flex flex-col">
            <ParamsPanel
              params={pendingParams}
              onChange={setPendingParams}
              onClose={() => setShowParams(false)}
            />
          </aside>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading…
      </div>
    );
  }
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Conversation not found
      </div>
    );
  }

  const isEmpty = conversation.messages.length === 0 && !stream.isStreaming;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between">
        <EditableTitle id={conversation.id} title={conversation.title} />
        {settingsButton}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <p className="text-gray-400 text-sm">
                Ask anything about your knowledge base
              </p>
              <div className="w-full max-w-2xl">
                <ChatInputForm
                  input={input}
                  setInput={setInput}
                  onSubmit={submit}
                  disabled={stream.isStreaming}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={conversation.messages}
                  streamingText={stream.isStreaming ? stream.text : undefined}
                  streamingSources={stream.sources}
                  streamingKnowledgeCheck={stream.knowledgeCheck}
                  isStreaming={stream.isStreaming}
                />
              </div>
              <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
                <div className="max-w-3xl mx-auto">
                  <ChatInputForm
                    input={input}
                    setInput={setInput}
                    onSubmit={submit}
                    disabled={stream.isStreaming}
                  />
                </div>
              </div>
            </>
          )}
        </main>
        {showParams && (
          <aside className="w-72 border-l border-gray-200 shrink-0 flex flex-col overflow-hidden">
            <ParamsPanel
              params={conversation.params}
              readOnly
              onClose={() => setShowParams(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
