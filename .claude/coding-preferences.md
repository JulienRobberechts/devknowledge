# Coding Preferences

## Hexagonal Architecture

By default, except different instructions in the project, a backend server should follow **hexagonal architecture** (ports & adapters).

The prefered file hierarchy should be:

Input adapters

```
api/             → for any REST server as input adapter — depends only on app-ports
cli/             → for any cli — depends only on app-ports
```

Core
``` 
app-ports/       → application port interfaces (use-case contracts)
app/     → use-case implementations — depends only on ports, never on infrastructure
domain/          → entities, value objects — no dependencies on other layers
infra-ports/     → infrastructure port interfaces (DB, storage, LLM, etc.)
```

Infrastructure
```
infrastructure/  → adapter implementations of infra-ports
```

Rules:
- `domain` must not import from any other layer.
- `application` must not import from `infrastructure` or `api`.
- New use cases must define or reuse ports; never call infrastructure directly from `application`.
- New infrastructure adapters must implement an existing `infra-ports` interface.

## Code Conventions

- All application interface classes and methods should have comments.
- No unnecessary comments in method bodies. Only add a comment when the **why** is non-obvious.
- No docstrings or multi-line comment blocks if possible.
- Prefer explicit types over `any`.
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

## Domain Language

- Every project has a glossary file (location defined in project context) — it is the authoritative source for domain terms; keep it up to date with precise definitions.
- Always use domain language in code and documentation; never invent synonyms for defined terms.
- When a new term is needed, propose several options to the user before adding it to the glossary.

## Commit Policy

- **Commit often**: one logical change per commit — never bundle unrelated changes.
- **Run checks before committing**: always run typecheck, lint, and tests in the affected package before committing.
- **Fix errors before committing**: never commit with typecheck, lint, or test failures. Fix them first.
- **Commit format**: `<type>: <short imperative description>` (e.g. `feat: add document ingestion use case`).
  - Types: `feat`, `fix`, `refac`, `test`, `docs`, `chore`.
- **Never commit**: `.env` files, secrets, credentials, or generated build artifacts.
- **Prefer atomic commits over WIP**: if a task is too large, split it into independently-working commits rather than committing broken intermediate states.
