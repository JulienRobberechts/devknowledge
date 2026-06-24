import { useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useConfig } from "../../hooks/useConfig";
import { useConversation } from "../../hooks/useConversation";
import { useSSEStream } from "../../hooks/useSSEStream";
import type { ConversationParams, Message } from "../../types/domain";
import ChatInputForm from "./ChatInputForm";
import EditableTitle from "./EditableTitle";
import MessageList from "./MessageList";
import ParamsPanel from "./ParamsPanel";

export default function ChatInterface() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conversation, isLoading } = useConversation(id ?? null);
  const { data: appConfig } = useConfig();
  const [input, setInput] = useState("");
  const [showParams, setShowParams] = useState(false);
  const [pendingParams, setPendingParams] = useState<Partial<ConversationParams>>({});
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const stream = useSSEStream(id ?? "");

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
        responseGroundingStrategies: [],
        searchMode: appConfig.rag.searchMode,
      });
    }
  }, [appConfig, pendingParams]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: id is an intentional trigger to reset state on navigation
  useEffect(() => {
    setPendingUserMessage(null);
  }, [id]);

  function submitNew(content: string) {
    setPendingUserMessage(content);
    stream.startNew(pendingParams, content, (newId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", newId] });
      navigate(`/conversations/${newId}`, { replace: true });
    });
  }

  function submit() {
    const content = input.trim();
    if (!content || stream.isStreaming) return;
    setInput("");
    if (!id) {
      submitNew(content);
      return;
    }
    stream.send(content, () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }

  const settingsButton = (
    <button
      type="button"
      onClick={() => setShowParams((v) => !v)}
      title={showParams ? "Hide settings" : "Show settings"}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
        showParams
          ? "border-amber-300 bg-amber-50 text-[#92400e]"
          : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      <Settings2 className="w-3.5 h-3.5" />
      Settings
    </button>
  );

  if (!id) {
    const pendingMessages: Message[] = pendingUserMessage
      ? [
          {
            id: "pending-user",
            conversationId: "",
            role: "user",
            content: pendingUserMessage,
            sources: [],
            createdAt: new Date().toISOString(),
          },
        ]
      : [];

    return (
      <div className="flex h-screen bg-slate-50">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-slate-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">New conversation</span>
            {settingsButton}
          </div>
          {stream.isStreaming || stream.text ? (
            <>
              <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={pendingMessages}
                  streamingText={stream.isStreaming ? stream.text : undefined}
                  streamingSources={stream.sources}
                  streamingResponseGrounding={stream.responseGrounding}
                  isStreaming={stream.isStreaming}
                />
              </div>
              <div className="border-t border-slate-200 bg-white px-4 py-3 shrink-0">
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <p className="text-slate-400 text-sm">Ask anything about your knowledge base</p>
              <div className="w-full max-w-2xl">
                <ChatInputForm
                  input={input}
                  setInput={setInput}
                  onSubmit={submit}
                  disabled={stream.isStreaming}
                />
              </div>
            </div>
          )}
        </div>
        {showParams && (
          <aside className="w-72 border-l border-slate-200 shrink-0 flex flex-col overflow-hidden">
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
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>
    );
  }
  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Conversation not found
      </div>
    );
  }

  const isEmpty = conversation.messages.length === 0 && !stream.isStreaming;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-6 py-3 shrink-0 flex items-center justify-between">
        <EditableTitle id={conversation.id} title={conversation.title} />
        {settingsButton}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <p className="text-slate-400 text-sm">Ask anything about your knowledge base</p>
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
                  streamingResponseGrounding={stream.responseGrounding}
                  isStreaming={stream.isStreaming}
                />
              </div>
              <div className="border-t border-slate-200 bg-white px-4 py-3 shrink-0">
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
          <aside className="w-72 border-l border-slate-200 shrink-0 flex flex-col overflow-hidden">
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
