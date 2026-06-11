import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useConversation,
  useCreateConversation,
  useUpdateConversationTitle,
} from "../../hooks/useConversation";
import { useSSEStream } from "../../hooks/useSSEStream";
import { useConfig } from "../../hooks/useConfig";
import MessageList from "./MessageList";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Pencil, Settings2 } from "lucide-react";
import type { ConversationParams } from "../../types/domain";

function EditableTitle({ id, title }: { id: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTitle = useUpdateConversationTitle();

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) {
      updateTitle.mutate({ id, title: trimmed });
    } else {
      setValue(title);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className="text-base font-semibold text-gray-800 bg-transparent border-b border-gray-400 outline-none w-full"
      />
    );
  }

  return (
    <button
      className="group flex items-center gap-1.5 text-base font-semibold text-gray-800 hover:text-gray-600 transition-colors"
      onClick={() => setEditing(true)}
      title="Edit title"
    >
      <span>{title}</span>
      <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  );
}

function InputForm({
  input,
  setInput,
  onSubmit,
  disabled,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="relative flex items-end gap-2 rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask a question…"
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-h-[24px] max-h-[200px] leading-relaxed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </form>
  );
}

function ParamsPanel({
  params,
  onChange,
}: {
  params: Partial<ConversationParams>;
  onChange: (p: Partial<ConversationParams>) => void;
}) {
  function field(
    label: string,
    key: keyof ConversationParams,
    type: "number" | "boolean",
    opts?: { min?: number; max?: number; step?: number },
  ) {
    const value = params[key];
    if (type === "boolean") {
      return (
        <label key={key} className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{label}</span>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange({ ...params, [key]: e.target.checked })}
            className="accent-indigo-600"
          />
        </label>
      );
    }
    return (
      <label key={key} className="flex items-center justify-between gap-4">
        <span className="text-xs text-gray-500 shrink-0">{label}</span>
        <input
          type="number"
          value={value as number}
          min={opts?.min}
          max={opts?.max}
          step={opts?.step ?? 1}
          onChange={(e) =>
            onChange({ ...params, [key]: parseFloat(e.target.value) })
          }
          className="w-24 text-xs text-right border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-indigo-400"
        />
      </label>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-2 w-full max-w-2xl">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Conversation parameters
      </p>
      {field("Retrieval limit", "retrievalLimit", "number", {
        min: 1,
        max: 20,
      })}
      {field("Min similarity score", "retrievalMinScore", "number", {
        min: 0,
        max: 1,
        step: 0.05,
      })}
      {field("Reranking", "rerankEnabled", "boolean")}
      {params.rerankEnabled &&
        field(
          "Rerank candidate multiplier",
          "rerankCandidateMultiplier",
          "number",
          { min: 1, max: 10 },
        )}
      <label className="flex items-center justify-between gap-4">
        <span className="text-xs text-gray-500 shrink-0">LLM model</span>
        <input
          type="text"
          value={(params.llmModel as string) ?? ""}
          onChange={(e) => onChange({ ...params, llmModel: e.target.value })}
          className="w-48 text-xs text-right border border-gray-200 rounded px-2 py-0.5 outline-none focus:border-indigo-400"
        />
      </label>
      {field("Temperature", "llmTemperature", "number", {
        min: 0,
        max: 1,
        step: 0.05,
      })}
      {field("Max tokens", "llmMaxTokens", "number", { min: 64, max: 8192 })}
    </div>
  );
}

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
        rerankEnabled: appConfig.rag.reranking,
        rerankCandidateMultiplier: 3,
        llmModel: appConfig.llm.model,
        llmTemperature: appConfig.llm.temperature,
        llmMaxTokens: appConfig.llm.maxTokens,
      });
    }
  }, [appConfig]);

  useEffect(() => {
    const pending = (location.state as { pendingMessage?: string } | null)
      ?.pendingMessage;
    if (!pending || !id || pendingSentRef.current) return;
    pendingSentRef.current = true;
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

  const isEmpty =
    !id ||
    (!!conversation &&
      conversation.messages.length === 0 &&
      !stream.isStreaming);

  const emptyState = (disabled: boolean) => (
    <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
      <p className="text-gray-400 text-sm">
        Ask anything about your knowledge base
      </p>
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <div className="flex justify-end">
          <button
            onClick={() => setShowParams((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
              showParams
                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Parameters
          </button>
        </div>
        {showParams && (
          <ParamsPanel params={pendingParams} onChange={setPendingParams} />
        )}
        <InputForm
          input={input}
          setInput={setInput}
          onSubmit={submit}
          disabled={disabled}
        />
      </div>
    </div>
  );

  if (!id) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {emptyState(createConversation.isPending)}
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3 shrink-0 flex items-center">
        <EditableTitle id={conversation.id} title={conversation.title} />
      </div>
      {isEmpty ? (
        emptyState(stream.isStreaming)
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <MessageList
              messages={conversation.messages}
              streamingText={stream.isStreaming ? stream.text : undefined}
              streamingSources={stream.sources}
              isStreaming={stream.isStreaming}
            />
          </div>
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <InputForm
                input={input}
                setInput={setInput}
                onSubmit={submit}
                disabled={stream.isStreaming}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
