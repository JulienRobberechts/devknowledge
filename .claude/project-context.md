# Project Context: Argos DevKnowledge

RAG application (Retrieval-Augmented Generation) for internal knowledge management.

## Stack

- **Backend**: Node.js / TypeScript, Express 5, Vitest, Biome. Uses Hexagonal Architecture.
- **Frontend**: React 19 / TypeScript, Vite, Tailwind CSS 4, Biome
- **DB**: PostgreSQL
- **Storage**: Cloudflare R2 (compatible AWS S3)
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`)
- **Infra**: Docker Compose in dev, Docker in prod on Railway

## Domain Language

- Glossary: `docs/glossary.md`

## Architecture Decisions

- ADRs: `docs/decisions/`

## Tests

Runner: Vitest.
- Unit: `src/**/*.test.ts` — fakes in `tests/fakes/`
- Integration: `tests/integration/` — against PostgreSQL; excluded from CI
- E2E: `tests/retrieval/` — RAG quality checks; excluded from CI

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
