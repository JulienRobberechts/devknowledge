# Project Context: Argos

RAG application (Retrieval-Augmented Generation) for internal knowledge management.

## Stack

- **Backend**: Node.js / TypeScript, Express 5, Vitest, Biome. Uses Hexagonal Architecture.
- **Frontend**: React 19 / TypeScript, Vite, Tailwind CSS 4, Biome
- **DB**: PostgreSQL
- **Storage**: Cloudflare R2 (AWS S3-compatible)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`)
- **Infra**: Docker Compose (dev), Docker on Railway (prod)

## Paths

- Glossary: `docs/glossary.md`
- ADRs: `docs/decisions/`
- Bugs: `docs/bugs/`

## Tests

Runner: Vitest.
- Unit: `src/**/*.test.ts` — fakes in `tests/fakes/`
- Integration: `tests/integration/` — excluded from CI
- E2E: `tests/retrieval/` — excluded from CI

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
