# Coding Preferences

## Hexagonal Architecture

Backend follows **hexagonal architecture** (ports & adapters):

```
api/             → REST input adapter
cli/             → CLI input adapter
app-ports/       → application port interfaces
app/             → use-case implementations
domain/          → entities, value objects
infra-ports/     → infrastructure port interfaces
infrastructure/  → adapter implementations
```

Rules:
- `domain` has no imports from other layers.
- `app` must not import from `infrastructure` or `api`.
- Use cases must go through ports — never call infrastructure directly.
- Infrastructure adapters must implement an `infra-ports` interface.

## Code Style

- Interface methods must have comments. No body comments unless the **why** is non-obvious.
- Explicit types over `any`; no unused imports, variables, or dead code.
- One responsibility per function/class — split if "and" is needed to describe it.
- Functions under 20 lines; extract nested or hard-to-name logic.
- Names reveal intent — avoid `data`, `info`, `manager`, `handler` without context.
- Named constants over magic values; early returns over nested `if/else`.
- Isolate side effects and I/O at the edges; one abstraction level per function body.
- Extract duplication only when the abstraction has a clear name and purpose.
- Delete dead code — never comment it out.
- **Consistent abstraction level**: a function body should operate at one level of abstraction.

## Tests

- **Unit**: app/domain logic; in-memory fakes for repos, `vi.fn()` for adapters. Next to source file.
- **Integration**: real database. Excluded from CI.
- **E2E**: quality checks. Excluded from CI.
Factory functions (`makeXxx()`) for test data; app tests must not import from `infrastructure/`.

## Architecture Decisions

Create or update an ADR for every significant technical decision.
Format: `ADR-NNN-short-title.md` — sections: Context, Options Considered, Decision, Consequences.

## Domain Language

The glossary is the authoritative source — keep it up to date. Never invent synonyms; propose options before adding new terms.

## Commit Policy

- One logical change per commit; split large tasks into independently-working commits.
- Run typecheck, lint, and tests before committing — fix failures first.
- Format: `<type>: <short imperative description>` — types: `feat`, `fix`, `refac`, `test`, `docs`, `chore`.
- Never commit `.env`, secrets, credentials, or build artifacts.
