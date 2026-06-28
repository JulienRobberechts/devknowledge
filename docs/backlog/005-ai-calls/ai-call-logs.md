# Phase 18 — Logs des appels API d'IA

**Durée estimée : 1 jour**
**Livrable : traçabilité complète de chaque appel LLM/Embedding/Rerank, consultable par conversation dans le frontend**

**Prérequis : Phase 4** (use-cases RAG), **Phase 5** (API HTTP), **Phase 6** (Frontend React)

---

## Contexte

Chaque question posée dans une conversation déclenche une cascade d'appels vers des APIs d'IA externe (Anthropic pour le LLM, Voyage pour les embeddings et le reranking). Sans traçabilité, il est impossible de comprendre :

- quel prompt exact a été envoyé à quel modèle
- combien de temps a pris chaque étape du pipeline
- pourquoi une réponse est de mauvaise qualité (prompt trop long, contexte mal construit, etc.)

Cette phase instrumente les trois adaptateurs existants (`AnthropicLLMAdapter`, `VoyageEmbeddingAdapter`, `VoyageRerankAdapter`) via le **pattern décorateur** pour persister chaque appel en base, puis ajoute une page frontend pour explorer ces logs par conversation.

---

## Modèle de données

### Table `ai_call_logs`

```sql
CREATE TABLE ai_call_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identification de l'appel
  provider        TEXT NOT NULL,  -- 'anthropic' | 'voyage'
  call_type       TEXT NOT NULL,  -- 'llm' | 'embedding' | 'rerank'
  pipeline_step   TEXT NOT NULL,  -- voir liste ci-dessous
  model           TEXT NOT NULL,

  -- Contenu
  prompt          TEXT,           -- prompt complet (null pour embedding/rerank)
  response        TEXT,           -- réponse complète (null pour embedding/rerank)
  input_texts     JSONB,          -- textes passés à embed/rerank (array de strings)
  response_meta   JSONB,          -- ex: { "vectorDimension": 1024, "inputCount": 3 }

  -- Performance
  duration_ms     INTEGER NOT NULL,
  input_tokens    INTEGER,        -- si fourni par l'API
  output_tokens   INTEGER,        -- si fourni par l'API

  -- Corrélation
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Paramètres de l'appel
  options         JSONB NOT NULL DEFAULT '{}'  -- temperature, maxTokens, inputType, rerankModel…
);

CREATE INDEX ai_call_logs_conversation_id_idx ON ai_call_logs(conversation_id);
CREATE INDEX ai_call_logs_created_at_idx ON ai_call_logs(created_at DESC);
CREATE INDEX ai_call_logs_pipeline_step_idx ON ai_call_logs(pipeline_step);
```

### Valeurs de `pipeline_step`

| Valeur                            | Déclencheur                                                   |
|-----------------------------------|---------------------------------------------------------------|
| `ask_question.embed_query`        | Embedding de la question utilisateur (SearchKnowledge)        |
| `ask_question.rerank`             | Reranking des chunks récupérés                                |
| `ask_question.generate_answer`    | Génération de la réponse principale (AskQuestion)             |
| `ask_question.generate_title`     | Génération automatique du titre de conversation               |
| `ask_question.knowledge_check`    | Appels LLM des stratégies faithfulness/counterfactual/etc.    |
| `ingest.embed_chunks`             | Embedding des chunks lors de l'ingestion d'un document        |
| `summarize.generate`              | Génération du résumé d'un document (SummarizeDocument)        |
| `quiz.generate`                   | Génération d'un quiz (GenerateQuiz)                           |

---

## Architecture

### Pattern : décorateurs de logging

On ne modifie pas les adaptateurs existants. On crée des **décorateurs** qui wrappent les ports existants et persistent les logs avant de déléguer à l'implémentation réelle.

```
AnthropicLLMAdapter  ←  LoggingLLMAdapter (wraps LLMPort)
VoyageEmbeddingAdapter  ←  LoggingEmbeddingAdapter (wraps EmbeddingPort)
VoyageRerankAdapter  ←  LoggingRerankAdapter (wraps RerankPort)
```

### Propagation du contexte (`pipeline_step`, `conversation_id`)

Les options des ports sont étendues pour transporter ce contexte :

```typescript
// LLMPort.ts — ajout optionnel
export interface LLMStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  pipelineStep?: string;      // NOUVEAU
  conversationId?: string;    // NOUVEAU
}

// EmbeddingPort.ts — nouveau type d'options
export interface EmbeddingCallOptions {
  pipelineStep?: string;
  conversationId?: string;
}

// RerankPort.ts — idem
export interface RerankCallOptions {
  pipelineStep?: string;
  conversationId?: string;
}
```

Les use-cases (`AskQuestion`, `SearchKnowledge`, `SummarizeDocument`, etc.) passent déjà ces informations pour les logs console — il faut seulement les ajouter aux options d'appel.

### Port de persistence

```typescript
// domain/ports/AICallLogRepository.ts
export interface AICallLog {
  provider: string;
  callType: 'llm' | 'embedding' | 'rerank';
  pipelineStep: string;
  model: string;
  prompt?: string;
  response?: string;
  inputTexts?: string[];
  responseMeta?: Record<string, unknown>;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  conversationId?: string;
  options?: Record<string, unknown>;
}

export interface AICallLogRepository {
  save(log: AICallLog): Promise<void>;
  findByConversation(conversationId: string): Promise<(AICallLog & { id: string; createdAt: Date })[]>;
  findRecent(limit: number): Promise<(AICallLog & { id: string; createdAt: Date })[]>;
}
```

---

## Tâches

### Backend — Migration & Repository

- [ ] **18.1** Migration `006_ai_call_logs.sql` — créer la table `ai_call_logs` avec les index

- [ ] **18.2** `PgAICallLogRepository` dans `infrastructure/db/`
  - Implémente `AICallLogRepository`
  - `save()` : INSERT en feu-et-oubli (ne jamais bloquer le pipeline si le log échoue)
  - `findByConversation()` : ORDER BY created_at ASC
  - `findRecent()` : ORDER BY created_at DESC, LIMIT paramétré
  - Critère : une erreur SQL dans `save()` est loggée en console mais ne propage pas d'exception

### Backend — Décorateurs

- [ ] **18.3** `LoggingLLMAdapter` dans `infrastructure/llm/`
  - Wraps `LLMPort`
  - Avant `stream()` : note `Date.now()`
  - Après : appelle `aiCallLogRepo.save()` avec `prompt`, `response`, `durationMs`, `conversationId`, `pipelineStep`, `model`, `options`
  - Critère : le log est écrit même si le stream est interrompu (AbortSignal)

- [ ] **18.4** `LoggingEmbeddingAdapter` dans `infrastructure/embeddings/`
  - Wraps `EmbeddingPort`
  - Log `embedMany()` uniquement (embed délègue à embedMany)
  - Stocke dans `input_texts` (tableau) et `response_meta: { vectorDimension, inputCount }`
  - Ne stocke pas les vecteurs eux-mêmes (trop volumineux)

- [ ] **18.5** `LoggingRerankAdapter` dans `infrastructure/reranking/`
  - Wraps `RerankPort`
  - Stocke `input_texts` (les documents soumis au reranking), la requête dans `prompt`, et dans `response_meta: { scores: [...] }`

### Backend — Propagation du contexte dans les use-cases

- [ ] **18.6** Étendre `LLMStreamOptions` avec `pipelineStep?` et `conversationId?`

- [ ] **18.7** `AskQuestion` — passer le contexte aux appels LLM :
  - `generate_answer` : `pipelineStep: 'ask_question.generate_answer'`, `conversationId`
  - `generate_title` : `pipelineStep: 'ask_question.generate_title'`, `conversationId`

- [ ] **18.8** `CheckContextualKnowledge` — passer `pipelineStep: 'ask_question.knowledge_check'` et `conversationId`

- [ ] **18.9** `SearchKnowledge` — étendre les signatures `embed()` et `rerank()` avec les options de contexte :
  - Embedding : `pipelineStep: 'ask_question.embed_query'`, `conversationId`
  - Rerank : `pipelineStep: 'ask_question.rerank'`, `conversationId`
  - Pour l'ingestion (appelé depuis `IngestDocument`) : `pipelineStep: 'ingest.embed_chunks'`

- [ ] **18.10** `SummarizeDocument` — `pipelineStep: 'summarize.generate'`

- [ ] **18.11** `GenerateQuiz` — `pipelineStep: 'quiz.generate'`

### Backend — Route API

- [ ] **18.12** `GET /ai-logs?conversationId=<uuid>` — logs d'une conversation, triés par date ASC
  ```json
  [
    {
      "id": "...",
      "createdAt": "...",
      "provider": "anthropic",
      "callType": "llm",
      "pipelineStep": "ask_question.generate_answer",
      "model": "claude-haiku-4-5-20251001",
      "durationMs": 1342,
      "prompt": "...",
      "response": "...",
      "options": { "temperature": 0.1, "maxTokens": 1024 }
    }
  ]
  ```

- [ ] **18.13** `GET /ai-logs/recent?limit=50` — derniers logs (toutes conversations), pour debug global

- [ ] **18.14** Enregistrer les décorateurs dans `index.ts` à la place des adaptateurs directs

### Frontend — Page AI Logs

- [ ] **18.15** Ajouter les deux appels dans `services/api.ts` :
  - `getAILogsByConversation(conversationId: string): Promise<AICallLog[]>`
  - `getRecentAILogs(limit?: number): Promise<AICallLog[]>`

- [ ] **18.16** Créer `AILogsPage` à la route `/ai-logs`
  - Accessible depuis la navigation principale (icône "terminal" ou "activity")
  - Par défaut : affiche les 50 derniers logs toutes conversations confondues

- [ ] **18.17** Composant `AILogTimeline` — affichage chronologique des logs d'une conversation
  - Entrée : `conversationId` (optionnel, si non fourni = mode global)
  - Chaque appel = une ligne dans la timeline avec :
    - Badge coloré `provider` (violet = Anthropic, bleu = Voyage)
    - Badge `call_type` (LLM / Embedding / Rerank)
    - Badge `pipeline_step` (texte raccourci)
    - Durée en ms
    - Date/heure relative
    - Chevron pour expand/collapse

- [ ] **18.18** Composant `AILogDetail` — vue expandée d'un appel
  - Prompt complet dans un `<pre>` scrollable avec coloration syntaxique légère
  - Réponse complète idem
  - Tableau des options (`model`, `temperature`, `maxTokens`, etc.)
  - Pour embedding/rerank : liste des textes en entrée (tronqués à 200 chars), métadonnées de sortie

- [ ] **18.19** Intégration dans `ChatInterface` — lien "Voir les logs" dans le header de conversation
  - Clique → ouvre un panel latéral `AILogTimeline` filtré sur la `conversationId` courante
  - (Alternative : lien vers `/ai-logs?conversationId=...`)

- [ ] **18.20** Barre de filtres sur `AILogsPage` (mode global)
  - Filtre par `pipeline_step` (select multiple)
  - Filtre par `provider`
  - Tri par durée (pour repérer les appels lents)

---

## Comportement de logging en cas d'erreur

- Si un appel API échoue (timeout, quota, etc.), le log est quand même persisté avec `response: null` et `durationMs` = temps jusqu'à l'erreur
- Le champ `response_meta` peut contenir `{ "error": "message" }` pour tracer l'erreur
- Le `save()` du log est toujours dans un try/catch isolé — une erreur de logging ne doit jamais planter le pipeline

---

## Questions ouvertes

- Faut-il stocker les prompts complets (potentiellement 10k+ chars) ou les tronquer à X chars ? Proposition : stocker entier, le frontend gère la pagination/truncation à l'affichage.
- Retention : faut-il un TTL automatique sur les logs (ex: 30 jours) ou les garder indéfiniment ?
- Faut-il exposer le log dans l'UI de conversation en temps réel (streaming) ou uniquement après la réponse complète ?

---

## Critères de sortie

- Toute question posée dans une conversation génère au minimum 3 logs : embedding de la query, LLM pour la réponse, et LLM pour le titre (au 1er message)
- `GET /ai-logs?conversationId=<uuid>` retourne tous ces appels dans l'ordre chronologique
- La page `/ai-logs` affiche une timeline lisible avec expand/collapse du prompt et de la réponse
- Un log raté (erreur SQL) ne plante pas la réponse à l'utilisateur
- Le log d'embedding ne stocke pas les vecteurs (seulement les textes en entrée et les dimensions en sortie)
