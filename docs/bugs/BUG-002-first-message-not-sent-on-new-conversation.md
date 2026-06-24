# BUG-002 — First message not sent on new conversation

**Date**: 2026-06-20
**Severity**: high
**File**: `frontend/src/components/chat/ChatInterface.tsx`

## Symptom

When starting a new conversation with an initial message, the message is silently dropped — the question disappears from the input field but is never sent to the server. The conversation page loads (GET 304 returns `messages: []`) but no send call occurs. Reproducible every time a new conversation is initiated from a blank state.

## Root Cause

A race condition between `useEffect` re-runs and a one-shot guard ref in `ChatInterface.tsx:50–65`.

The flow:
1. User submits a message → app creates a conversation, navigates to `/conversations/:id` with `location.state.pendingMessage`.
2. `useEffect` fires, sees `pendingMessage`, sets `pendingSentForIdRef.current = id`, calls `navigate(..., { state: {} })` to clear state, then calls `stream.send(pending)`.
3. Because `stream.send` is in the dependency array, when `useSSEStream` returns a new stable `send` reference after `id` settles, the effect re-runs. By then `pendingSentForIdRef.current === id` is already true → early return → the guard blocks the real send if `stream.send` changed reference before the first run completed.

Three failed fixes (commits):
- **`85d6a86`** (Jun 12) — `useRef(false)` boolean guard, but cleanup (`return () => { ref.current = false }`) reset it on unmount → back-navigation re-sent the message.
- **`135c8b7`** (Jun 13) — replaced with `useRef<string | null>(null)` storing the conversation `id` + `navigate(..., { state: {} })` to clear navigation state. Fixed re-send, but introduced the deps-race: `stream.send` in deps causes effect re-run after guard is already set → send never fires.

## Fix

**Commit `d25e8fb`** — frontend stopgap (guard ref + `history.replaceState`)
**Commit `abfaf22`** — full fix (backend + frontend)

Three changes applied together:

1. **`streamRef`** — keeps `stream` current via a no-dep `useEffect`, so `stream.send` can be called inside the pending-message effect without being listed as a dependency.

2. **`window.history.replaceState`** — replaces `navigate(location.pathname, { replace: true, state: {} })`. Clears the navigation state in the browser history without going through React Router, so no re-render is triggered and the effect does not re-run spuriously.

3. **Narrowed deps array** — reduced from 6 entries (`id`, `stream.send`, `queryClient.invalidateQueries`, `navigate`, `location.pathname`, `location.state.pendingMessage`) to 3 (`id`, `pendingMessage`, `queryClient`). Only deps that should legitimately re-trigger the send are kept.

```tsx
const streamRef = useRef(stream);
useEffect(() => { streamRef.current = stream; });

const pendingMessage = (location.state as { pendingMessage?: string } | null)?.pendingMessage;

useEffect(() => {
  if (!pendingMessage || !id || pendingSentForIdRef.current === id) return;
  pendingSentForIdRef.current = id;
  window.history.replaceState({ ...window.history.state, usr: null }, "");
  streamRef.current.send(pendingMessage, () => {
    queryClient.invalidateQueries({ queryKey: ["conversations", id] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  });
}, [id, pendingMessage, queryClient]);
```

**Commit `abfaf22`** — architectural fix eliminating `pendingMessage` navigation state entirely.

Backend: `POST /conversations` now requires `firstMessage` and returns SSE instead of JSON:
- `event: created` → `{ conversationId }`
- `event: delta / sources / done` — same as `POST /:id/messages`

Frontend (`sse.ts`): `createConversationAndStream()` — opens SSE to `POST /conversations`, parses the `created` event plus the message stream via a shared `parseSSEStream` helper.

Frontend (`useSSEStream.ts`): `startNew(params, content, onComplete)` — wraps `createConversationAndStream`, tracks the `conversationId` from the `created` event, calls `onComplete(id)` on `done`.

Frontend (`ChatInterface.tsx`): `submitNew` calls `stream.startNew`. The streaming text is shown on the `/conversations/new` page (user message + assistant stream). On `done`, navigates to `/conversations/:id`. No `pendingMessage` in navigation state, no guard ref, no `useEffect` timing issue.

---

## Follow-up Bug — "New conversation" shows stale state (2026-06-24)

### Symptom

Clicking "New conversation" navigates to `/conversations/new` but displays the previous conversation's user message and the assistant's response, with the input field at the bottom instead of centered.

### Root Cause

React Router reuses the same `ChatInterface` instance when navigating between `/conversations/new` and `/conversations/:id` (same component type, no `key` prop). Two pieces of state from the previous stream survived the navigation:

1. `pendingUserMessage` (local state in `ChatInterface`) — held the last user message typed on `/new`.
2. `stream.text` (`useSSEStream`) — held the accumulated assistant response. The cleanup `useEffect` had `[]` as deps, so it only reset on unmount, never on `conversationId` change.

The `/new` branch renders `MessageList + bottom input` when `stream.isStreaming || stream.text` is truthy, so stale `stream.text` from the previous session triggered that branch instead of the centered input.

### Fix

**`useSSEStream.ts`** — changed cleanup effect deps from `[]` to `[conversationId]`. State (`text`, `sources`, `isStreaming`) and the active SSE connection are now reset whenever `conversationId` changes, not only on unmount.

**`ChatInterface.tsx`** — added `useEffect(() => { setPendingUserMessage(null); }, [id])` to clear the pending user message on every route change.

### Lesson

- React Router does not remount a component when switching between two routes that use the same element type without a `key` prop — all local state and hook state persist across navigations.
- Cleanup effects with `[]` deps are unmount-only; use the relevant prop as a dep to reset on value change.

## Lessons

- Never put `stream.send` or other potentially unstable callbacks in a `useEffect` deps array when the effect is a one-shot guard. Use a ref instead.
- `navigate(..., { state: {} })` triggers React Router re-renders and can cause the same `useEffect` to re-fire — prefer `history.replaceState` to clear navigation state without a re-render.
- A boolean ref guard is not enough when the component unmounts/remounts (cleanup resets it) — key the ref to the conversation `id`.
- The cleanest fix eliminates client-side orchestration entirely: one API call that creates the conversation and queues the first message server-side.
- Add a test: navigate away from a new conversation and back, assert `messages.length === 1`.
