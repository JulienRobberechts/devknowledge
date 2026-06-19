# Project: Argos DevKnowledge

RAG application (Retrieval-Augmented Generation) for internal knowledge management.

## Stack

- **Backend**: Node.js / TypeScript, Express 5, Vitest, Biome
- **Frontend**: React 19 / TypeScript, Vite, Tailwind CSS 4, Biome
- **DB**: PostgreSQL
- **Storage**: Cloudflare R2 (compatible AWS S3)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`)
- **Infra**: Docker Compose in dev, Docker in prod on Railway

## Language

All code, comments, documentation, variable names, commit messages, and PR descriptions must be written in **English**.

## Architecture

The backend follows **hexagonal architecture** (ports & adapters). Strictly enforce layer boundaries:

```
api/             → Express routes — depends only on app-ports

app-ports/       → application port interfaces (use-case contracts)
application/     → use-case implementations — depends only on ports, never on infrastructure

domain/          → entities, value objects — no dependencies on other layers

infra-ports/     → infrastructure port interfaces (DB, storage, LLM, etc.)
infrastructure/  → adapter implementations of infra-ports
```

Rules:
- `domain` must not import from any other layer.
- `application` must not import from `infrastructure` or `api`.
- New use cases must define or reuse ports; never call infrastructure directly from `application`.
- New infrastructure adapters must implement an existing `infra-ports` interface.

## Code Conventions

- All application interface classes and methods should have comments.
- No unnecessary comments in method cors. Only add a comment when the **why** is non-obvious.
- No docstrings or multi-line comment blocks if possible.
- Prefer explicit types over `any`.
- Linting and formatting via **Biome** (not ESLint/Prettier).
- No unused imports, variables, or dead code.

## Clean Code

- **Single responsibility**: each function/class does one thing. If you need "and" to describe it, split it.
- **Small functions**: prefer functions under 20 lines. Extract when logic becomes nested or hard to name.
- **Meaningful names**: names must reveal intent. Avoid abbreviations, `data`, `info`, `manager`, `handler` without context.
- **No magic values**: extract constants with descriptive names.
- **Avoid deep nesting**: use early returns and guard clauses instead of nested `if/else`.
- **Pure functions preferred**: minimize side effects; isolate I/O and mutations at the edges.
- **DRY but not over-abstracted**: extract duplication only when the abstraction has a clear name and single purpose. Three similar lines beat a premature abstraction.
- **Delete dead code**: never comment out code — delete it. Git history preserves it.
- **Consistent abstraction level**: a function body should operate at one level of abstraction (don't mix high-level orchestration with low-level string manipulation).

## Common Commands

### Backend (`/backend`)

```bash
npm run dev          # start dev server (tsx watch)
npm run test         # run tests (vitest)
npm run typecheck    # TypeScript check
npm run check        # Biome lint + format
npm run migrate      # run DB migrations
```

### Frontend (`/frontend`)

```bash
npm run dev          # start Vite dev server
npm run typecheck    # TypeScript check
npm run check        # Biome lint + format
```
