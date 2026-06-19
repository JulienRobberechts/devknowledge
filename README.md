# Argos — Système RAG de démonstration

![CI](https://github.com/JulienRobberechts/argos/actions/workflows/ci.yml/badge.svg)

Argos est une application complète de **Retrieval-Augmented Generation (RAG)** conçue pour interroger une base de connaissances de documents internes via un LLM. Ce projet de démonstration met en œuvre les pratiques d'un système en production : architecture hexagonale stricte, pipeline RAG multi-étapes, recherche hybride, vérification de la qualité des réponses.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture hexagonale](#architecture-hexagonale)
- [Pipeline RAG](#pipeline-rag)
- [Stack technique](#stack-technique)
- [Tests et qualité](#tests-et-qualité)
- [Évaluation RAG](#évaluation-rag)
- [CI/CD](#cicd)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Limitations PDF](#limitations-pdf)

---

## Fonctionnalités

- **Ingestion multi-format** : PDF, Markdown, texte brut
- **Chunking configurable** : stratégie récursive ou par phrase, taille et overlap ajustables à chaud
- **Recherche hybride** : similarité vectorielle (pgvector) + BM25 full-text (tsvector), fusion RRF
- **Reranking optionnel** : Voyage AI avec multiplicateur de candidats configurable
- **Streaming LLM** : réponse token par token via SSE, annulation possible
- **Vérification de l'ancrage** : three stratégies — faithfulness, citation_forcing, counterfactual
- **Conversations multi-tours** : historique glissant (4 derniers échanges)
- **Génération de quiz** : QCM à partir des documents ingérés
- **Résumés de documents** : résumé LLM persisté par document
- **Stockage swappable** : système de fichiers local ou Cloudflare R2 (sans redémarrage)
- **Dashboard technique** : pages explicatives sur le pipeline RAG, le chunking, le reranking, le hybrid search et l'évaluation

---

## Architecture hexagonale

Le backend applique l'**architecture hexagonale (Ports & Adapters)** de façon stricte : le domaine est totalement isolé de l'infrastructure. Aucun import de framework ou d'outil externe ne traverse la frontière du domaine.

```
backend/src/
├── domain/                  ← cœur métier pur, zéro dépendance externe
│   ├── entities/            ← Document, Chunk, Conversation, Message
│   ├── ports/               ← interfaces I* (ILLMPort, IChunkRepository, IFileStoragePort…)
│   └── services/            ← logique de chunking (RecursiveChunkingStrategy, SentenceChunkingStrategy)
│
├── application/             ← use cases orchestrant le domaine via les ports
│   ├── IngestDocument.ts
│   ├── AskQuestion.ts
│   ├── RetrieveKnowledge.ts
│   ├── SummarizeDocument.ts
│   ├── GenerateQuiz.ts
│   └── responseChecks/      ← vérification de l'ancrage (faithfulness, citation_forcing, counterfactual)
│
├── infra/                   ← adaptateurs implémentant les ports du domaine
│   ├── db/                  ← PgVectorChunkRepository, PgDocumentRepository… (PostgreSQL + pgvector)
│   ├── llm/                 ← AnthropicLLMAdapter
│   ├── embeddings/          ← VoyageEmbeddingAdapter
│   ├── reranking/           ← VoyageRerankAdapter, NoopRerankAdapter
│   ├── parsers/             ← MarkdownParser, PdfParser, TextParser, MultiFileParser
│   └── storage/             ← LocalFileStorage, R2FileStorage, DynamicFileStorage
│
└── api/                     ← adaptateurs entrants (routes Express, middleware, DTOs)
    ├── routes/
    └── middleware/
```

### Principe de dépendance

```
api → application → domain ← infra
```

Les use cases (`application/`) ne connaissent que les interfaces définies dans `domain/ports/`. La couche `infra/` implémente ces interfaces. La composition finale est réalisée dans `registry.ts` — un seul point de câblage, sans framework d'injection.

### Exemple : le port ILLMPort

```typescript
// domain/ports/ILLMPort.ts — interface pure, aucune dépendance
export interface ILLMPort {
  stream(prompt: string, onToken: (token: string) => void,
         signal?: AbortSignal, options?: LLMStreamOptions): Promise<string>;
}

// infra/llm/AnthropicLLMAdapter.ts — implémentation concrète
export class AnthropicLLMAdapter implements ILLMPort { ... }
```

Changer de fournisseur LLM (OpenAI, Mistral…) revient à écrire un nouvel adaptateur sans toucher une seule ligne de domaine ni d'application.

---

## Pipeline RAG

### Ingestion

```
Upload fichier
     │
     ▼
CreateDocument ──→ storage (local / R2) + DB (status: pending)
     │
     ▼
IngestDocument
  ├─ download depuis storage
  ├─ parsing (PDF / Markdown / texte)
  ├─ chunking (récursif ou sentence-based, taille/overlap configurables)
  ├─ embedding par batch de 20 (Voyage AI voyage-4-lite, 1024 dims)
  └─ persistance chunks + vecteurs (pgvector) → status: ready
```

L'ingestion est **idempotente** : les chunks existants sont supprimés avant réingestion. Le document passe en statut `error` en cas d'échec partiel, permettant une reprise sans état corrompu.

### Question/Réponse

```
Question utilisateur
     │
     ▼
RetrieveKnowledge
  ├─ embedding de la question
  ├─ recherche hybride (pgvector cosine + tsvector BM25, fusion RRF k=60)
  └─ reranking optionnel (Voyage AI, multiplicateur ×3 de candidats)
     │
     ▼
AskQuestion
  ├─ construction du prompt RAG (sources + historique glissant)
  ├─ streaming LLM token par token (SSE, AbortSignal supporté)
  └─ vérification de l'ancrage (post-traitement)
         ├─ citation_forcing : le LLM cite [SOURCE N] inline, score parsé
         ├─ faithfulness    : chaque affirmation vérifiée contre les chunks
         └─ counterfactual  : mesure la valeur ajoutée du contexte RAG
```

### Recherche hybride (pgvector + BM25)

La recherche purement vectorielle échoue sur les requêtes exactes (noms propres, acronymes, identifiants). La stratégie hybride combine les deux signaux :

```sql
-- Colonne tsvector maintenue automatiquement par trigger PostgreSQL
ALTER TABLE chunks ADD COLUMN ts_content tsvector;
CREATE INDEX chunks_ts_content_idx ON chunks USING GIN(ts_content);
```

Fusion via **Reciprocal Rank Fusion** :

```
score_rrf = 1/(k + rank_vecteur) + 1/(k + rank_bm25)   k = 60
```

Le mode (`vector` | `hybrid`) est configurable à chaud depuis le dashboard.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Node.js 22, TypeScript 6 strict |
| HTTP | Express 5 |
| Base de données | PostgreSQL 16 + pgvector |
| Embeddings | Voyage AI (voyage-4-lite, 1024 dims) |
| LLM | Anthropic Claude (claude-haiku-4 / claude-sonnet-4) |
| Reranking | Voyage AI (rerank-2) |
| Stockage fichiers | Local filesystem / Cloudflare R2 (AWS S3 compatible) |
| Frontend | React 19, Vite 8, TailwindCSS v4, TanStack Query |
| Linting/Format | Biome |
| Tests | Vitest + supertest |
| CI/CD | GitHub Actions → Railway |
| Conteneurisation | Docker Compose (dev + prod) |

---

## Tests et qualité

### Stratégie de test

Le projet distingue trois niveaux de tests, chacun avec un contrat de vitesse et d'isolation différent :

**Tests unitaires — rapides, sans I/O**

Les use cases sont testés avec des **fakes in-memory** qui implémentent les mêmes ports que la production :

```
tests/fakes/
├── InMemoryChunkRepository.ts
├── InMemoryDocumentRepository.ts
├── InMemoryConversationRepository.ts
└── NullLogger.ts
```

Exemple sur `IngestDocument` : le test vérifie l'idempotence, le batching des embeddings, les transitions de statut, les cas d'erreur — sans base de données ni réseau.

**Tests snapshot — stabilité des algorithmes de chunking**

Les stratégies de chunking sont validées contre des snapshots fixés sur des documents réels (Orient-Express, VSOE), avec plusieurs combinaisons de paramètres :

```
domain/services/ChunkingStrategies.snapshots/
├── recursive-orient-express-size150.ts
├── sentence-vsoe-size512-overlap128.ts
└── ...
```

Un changement accidentel de l'algorithme fait échouer le snapshot — pas besoin d'assertion manuelle sur chaque chunk.

**Tests d'intégration — exclus de la CI, disponibles en local**

```typescript
// vitest.config.ts
exclude: process.env.CI ? ["tests/integration/**", "tests/retrieval/**"] : [],
```

Les tests d'intégration frappent une vraie base PostgreSQL locale. Ils vérifient la recherche vectorielle réelle, les migrations, les repositories Pg.

### Couverture

```bash
npm run test:coverage   # rapport v8
```

La couverture exclut délibérément les fichiers de câblage (`index.ts`, `migrate.ts`, `pool.ts`) — on couvre la logique, pas le bootstrapping.

### Linting et formatage

[Biome](https://biomejs.dev/) remplace ESLint + Prettier en une seule passe :

```bash
npm run check   # lint + format --write
npm run typecheck   # tsc --noEmit strict
```

Les deux jobs `lint` et `build` (typecheck) sont indépendants en CI.

---

## Évaluation RAG

La majorité des projets RAG publiés ne mesurent pas la qualité de leurs réponses. Argos inclut une **suite d'évaluation automatisée** sur un dataset de 14 paires question/réponse de référence.

### Métriques

| Métrique | Description |
|----------|-------------|
| **Faithfulness** | Les affirmations de la réponse sont toutes présentes dans les chunks récupérés |
| **Answer Relevance** | La réponse répond bien à la question (similarité cosine entre embeddings) |
| **Context Recall** | Les chunks récupérés couvrent les affirmations de la réponse attendue |

### Implémentation

```
tests/eval/
├── dataset.json          ← 14 paires Q/R (Orient-Express + Val-en-Selve, easy/medium/hard)
├── run.ts                ← script principal (SearchKnowledge → LLM → scorers)
└── scorers/
    ├── faithfulness.ts   ← wrapper sur checkFaithfulness existant (réutilisation, pas de duplication)
    ├── answerRelevance.ts ← LLM régénère la question, similarité cosine avec l'originale
    └── contextRecall.ts  ← décomposition en affirmations atomiques, couverture par chunk
```

L'évaluation réutilise les adaptateurs réels — pas de mock LLM, les scores sont représentatifs du comportement en production.

```bash
npm run eval
```

Exemple de sortie :

```
ID       Dataset          Diff    Faith  Relev  Recall
oe-01    orient-express   easy    1.00   0.92   0.88
oe-04    orient-express   medium  0.85   0.80   0.75
...
─────────────────────────────────────────────────────
Moyenne                           0.91   0.84   0.82
```

### Variables d'environnement requises

```env
ANTHROPIC_APP_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
DATABASE_URL=postgresql://argos:<PASSWORD>@localhost:5432/argos
```

> Pour exécuter depuis le host (hors conteneur Docker), surcharger `DATABASE_URL` avec `localhost` :
> ```bash
> DATABASE_URL=postgresql://argos:<PASSWORD>@localhost:5432/argos npm run eval
> ```

---

## CI/CD

Le pipeline GitHub Actions bloque le déploiement sur tout échec de qualité :

```
push / PR → main
    │
    ├── Tests (Vitest, unitaires uniquement, sans base)
    ├── Lint (Biome — backend + frontend)
    └── TypeScript check (tsc --noEmit — backend + frontend)
         │
         └── [main uniquement] Deploy → Railway
                 ├── argos-api
                 └── argos-frontend
```

Les jobs `test`, `lint` et `build` s'exécutent en parallèle. Le déploiement est conditionnel à leur succès collectif.

---

## Démarrage rapide

**Prérequis** : Docker, Node.js 22

```bash
# 1. Copier et renseigner les variables
cp .env.example .env

# 2. Démarrer la base et les services
docker compose up -d

# 3. (Optionnel) Lancer les tests backend
cd backend && npm ci && npm test

# 4. Accéder à l'interface
# Frontend : http://localhost:5173
# API      : http://localhost:3205
```

Les migrations SQL s'exécutent automatiquement au démarrage de l'API.

---

## Variables d'environnement

| Variable | Description | Obligatoire |
|----------|-------------|-------------|
| `ANTHROPIC_APP_API_KEY` | Clé API Anthropic (Claude) | Oui |
| `VOYAGE_API_KEY` | Clé API Voyage AI (embeddings + reranking) | Oui |
| `DATABASE_URL` | Connexion PostgreSQL | Oui |
| `APP_PASSWORD` | Mot de passe d'accès à l'interface | Oui |
| `STORAGE_BACKEND` | `local` (défaut) ou `r2` | Non |
| `R2_ACCOUNT_ID` | ID compte Cloudflare (si `STORAGE_BACKEND=r2`) | Conditonnel |
| `R2_ACCESS_KEY_ID` | Clé d'accès R2 | Conditionnel |
| `R2_SECRET_ACCESS_KEY` | Secret R2 | Conditionnel |
| `R2_BUCKET` | Nom du bucket R2 | Conditionnel |

---

## Limitations PDF

`pdf-parse` (Mozilla PDF.js) présente les limitations suivantes :

- **PDFs mono-colonne** : extraction fiable, structure des paragraphes préservée
- **PDFs multi-colonnes** : les colonnes peuvent s'interleaver — dégradation de la qualité RAG
- **Tableaux** : structure lignes/colonnes perdue, données restent indexables mais sans contexte relationnel
- **PDFs scannés** : texte vide (pas d'OCR)
- **PDFs protégés** : rejetés avec erreur de parsing
- **PDFs volumineux** (> 500 pages) : ingestion lente — préférer découper avant upload
