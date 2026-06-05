import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useConversation } from "../../hooks/useConversation";
import { useSSEStream } from "../../hooks/useSSEStream";
import MessageList from "./MessageList";
import { useState } from "react";

export default function ChatInterface() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: conversation, isLoading } = useConversation(id ?? null);
  const [input, setInput] = useState("");
  const stream = useSSEStream(id ?? "");

  function submit() {
    const content = input.trim();
    if (!content || stream.isStreaming || !id) return;
    setInput("");
    stream.send(content, () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading...
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

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="font-medium text-gray-800">{conversation.title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={conversation.messages}
          streamingText={stream.isStreaming ? stream.text : undefined}
          streamingSources={stream.sources}
          isStreaming={stream.isStreaming}
        />
      </div>
      <div className="border-t border-gray-200 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={stream.isStreaming}
            placeholder="Ask a question..."
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
      </div>
    </div>
  );
}
