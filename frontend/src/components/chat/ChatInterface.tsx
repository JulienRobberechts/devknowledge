import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useConversation,
  useCreateConversation,
  useUpdateConversationTitle,
} from "../../hooks/useConversation";
import { useSSEStream } from "../../hooks/useSSEStream";
import MessageList from "./MessageList";
import { useState, useRef, useEffect } from "react";

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
        className="text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none w-full"
      />
    );
  }

  return (
    <h1
      className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
      onClick={() => setEditing(true)}
      title="Click to edit title"
    >
      {title}
    </h1>
  );
}

export default function ChatInterface() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation();
  const { data: conversation, isLoading } = useConversation(id ?? null);
  const [input, setInput] = useState("");
  const stream = useSSEStream(id ?? "");
  const pendingSentRef = useRef(false);

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
    const conv = await createConversation.mutateAsync();
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isEmpty =
    !id ||
    (!!conversation &&
      conversation.messages.length === 0 &&
      !stream.isStreaming);

  if (!id) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex gap-2 w-full max-w-2xl"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={createConversation.isPending}
              placeholder="Ask your question…"
              rows={1}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={createConversation.isPending || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading…
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Conversation not found
      </div>
    );
  }

  const inputForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`flex gap-2${isEmpty ? " w-full max-w-2xl" : ""}`}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={stream.isStreaming}
        placeholder="Ask your question…"
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={stream.isStreaming || !input.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-gray-200 px-8 pt-8 pb-4 shrink-0">
        <EditableTitle id={conversation.id} title={conversation.title} />
      </div>
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center p-4">
          {inputForm}
        </div>
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
          <div className="border-t border-gray-200 p-4">{inputForm}</div>
        </>
      )}
    </div>
  );
}
