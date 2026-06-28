# Phase 13 — Évaluation RAG

**Durée estimée : 1,5 jour** (faithfulness déjà partiellement implémenté)
**Livrable : `npm run eval` — tableau de scores sur 3 métriques pour 14 paires Q/R**
**Prérequis : Phase 4** (pipeline RAG complet), **Phase 12** (hybrid search, recommandé)

---

## Contexte

La majorité des projets RAG publiés sur GitHub ne mesurent pas la qualité des réponses.
Ajouter une suite d'évaluation montre une vision end-to-end et une maturité rare pour un projet
de démonstration. C'est un signal fort pour un poste Staff/Lead Engineer.

Métriques cibles :
- **Faithfulness** : la réponse ne contient que des informations présentes dans les sources
- **Answer Relevance** : la réponse répond bien à la question posée (similarité cosine embedding)
- **Context Recall** : les chunks récupérés couvrent l'information attendue

---

## Ce qui existe déjà — ne pas réimplémenter

| Composant | Chemin | Usage dans eval |
|-----------|--------|-----------------|
| `checkFaithfulness` | `src/application/responseChecks/strategies/faithfulness.ts` | Réutiliser directement pour le scorer 13.2 |
| `VoyageEmbeddingAdapter` | `src/infrastructure/embeddings/VoyageEmbeddingAdapter.ts` | Cosine similarity pour AnswerRelevance |
| `AnthropicLLMAdapter` | `src/infrastructure/llm/AnthropicLLMAdapter.ts` | LLM juge pour ContextRecall |
| `SearchKnowledge` | `src/application/SearchKnowledge.ts` | Pipeline de retrieval dans `run.ts` |

Le script `run.ts` doit appeler **`SearchKnowledge.execute()`** directement (pas `AskQuestion`
pour éviter la gestion de conversation en base).

---

## Structure des fichiers

```
devknowledge/backend/tests/eval/
  dataset.json              ✅ créé — 14 paires Q/R (2 datasets)
  run.ts                    à créer — script principal
  scorers/
    faithfulness.ts         wrapper autour de checkFaithfulness existant
    answerRelevance.ts      à créer
    contextRecall.ts        à créer
```

---

## Tâches

- [x] **13.1** Dataset d'évaluation de référence
  - Fichier `tests/eval/dataset.json` — **créé, 14 paires**
  - 2 datasets : Orient-Express (7 questions) + Val-en-Selve (7 questions)
  - Difficultés : easy / medium / hard
  - Structure réelle :
    ```json
    {
      "id": "oe-01",
      "dataset": "orient-express",
      "difficulty": "easy",
      "question": "...",
      "expected_answer": "...",
      "document_ids": ["Orient-Express/orient-express.md"]
    }
    ```
  - ⚠️ `document_ids` contient des chemins relatifs vers les fichiers sources —
    à mapper vers les vrais IDs vectoriels après ingestion des documents de démo

- [x] **13.2** Scorer `Faithfulness`
  - Fichier : `tests/eval/scorers/faithfulness.ts`
  - **Réutiliser `checkFaithfulness`** — ne pas dupliquer la logique
  - Le wrapper appelle `checkFaithfulness(llm, question, ragAnswer, chunks, titleById)`
    et retourne `result.score` (entre 0 et 1)
  - Test unitaire : mock LLM retournant un JSON `{"claims": [...]}` valide et invalide,
    vérifier que le score = supported / total

- [x] **13.3** Scorer `AnswerRelevance`
  - Fichier : `tests/eval/scorers/answerRelevance.ts`
  - Algorithme :
    1. Prompt LLM : « Quelle question cette réponse cherche-t-elle à répondre ? Réponds uniquement avec la question. »
    2. Embedder la question originale et la question régénérée avec `VoyageEmbeddingAdapter`
    3. Retourner la similarité cosine (entre 0 et 1)
  - Cosine similarity inline (pas d'import externe) :
    ```ts
    function cosineSimilarity(a: number[], b: number[]): number {
      const dot = a.reduce((s, v, i) => s + v * b[i], 0);
      const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      return dot / (norm(a) * norm(b));
    }
    ```
  - Test unitaire : mock embedding retournant des vecteurs orthogonaux (score ≈ 0)
    et parallèles (score ≈ 1)

- [x] **13.4** Scorer `ContextRecall`
  - Fichier : `tests/eval/scorers/contextRecall.ts`
  - Algorithme :
    1. Prompt LLM : décomposer `expected_answer` en liste d'affirmations atomiques (JSON)
    2. Pour chaque affirmation, demander au LLM si elle est couverte par au moins un chunk (JSON)
    3. Score = affirmations couvertes / total affirmations
  - Prompt décomposition :
    ```
    Décompose cette réponse en affirmations atomiques (faits individuels).
    Réponds UNIQUEMENT avec du JSON : {"claims": ["affirmation 1", "affirmation 2", ...]}
    Réponse : "<expected_answer>"
    ```
  - Prompt vérification couverture (par affirmation) :
    ```
    Est-ce que l'affirmation suivante est couverte par au moins un des extraits ci-dessous ?
    Affirmation : "<claim>"
    Extraits :
    <chunks joints>
    Réponds UNIQUEMENT avec du JSON : {"covered": true|false}
    ```

- [x] **13.5** Script `tests/eval/run.ts`
  - Charge `dataset.json`, instancie les adaptateurs réels (`AnthropicLLMAdapter`,
    `VoyageEmbeddingAdapter`, `PgVectorChunkRepository`)
  - Pour chaque paire :
    1. `SearchKnowledge.execute(question)` → chunks
    2. `llm.stream(buildPrompt(question, chunks))` → réponse RAG
    3. Calcule `faithfulness`, `answerRelevance`, `contextRecall`
  - Affiche un tableau ASCII sur stdout + moyennes globales :
    ```
    ID       Dataset          Diff    Faith  Relev  Recall
    oe-01    orient-express   easy    1.00   0.92   0.88
    vs-02    val-en-selve     medium  0.85   0.78   0.75
    ...
    ─────────────────────────────────────────────────────
    Moyenne                           0.91   0.84   0.82
    ```
  - Variables d'env requises : `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`
  - Ajouter dans `package.json` :
    ```json
    "eval": "tsx tests/eval/run.ts"
    ```
  - Commande : `npm run eval`

- [ ] **13.5b** ⚠️ Améliorer le lancement de l'évaluation
  - **Problème** : `DATABASE_URL` dans `.env` utilise `postgres` (hostname Docker interne),
    non résolvable depuis le host — `npm run eval` échoue avec `EAI_AGAIN postgres`
  - **Solution à implémenter** : permettre de surcharger `DATABASE_URL` proprement
    sans modifier `.env` (qui doit rester compatible Docker), par exemple :
    - Supporter un fichier `.env.local` chargé en priorité par le script eval
    - Ou documenter l'usage de la variable inline :
      `DATABASE_URL=postgresql://...@localhost:5432/devknowledge npm run eval`
  - **Workaround actuel** : cf. README section Évaluation RAG

- [ ] **13.6** Seuil de qualité dans la CI *(optionnel, phase ultérieure)*
  - Job `eval` dans GitHub Actions, déclenché manuellement (`workflow_dispatch`)
  - Seuils de rejet : Faithfulness ≥ 0.80, AnswerRelevance ≥ 0.75
  - ⚠️ Coût LLM non nul — ne pas mettre en trigger automatique sur chaque PR

- [ ] **13.7** Documenter les résultats dans le README
  - Section « Evaluation » avec tableau des scores obtenus sur le dataset de démo
  - Mentionner les 2 datasets sources, les 3 métriques, et la commande `npm run eval`

---

## Critères de sortie

- `npm run eval` s'exécute sans erreur et retourne des scores pour les 3 métriques
- Faithfulness moyen ≥ 0.80 sur les 14 paires du dataset
- Section « Evaluation » dans le README avec scores réels mesurés

---

## Questions ouvertes

- Les `document_ids` dans `dataset.json` sont des chemins relatifs : faut-il un script
  d'ingestion des documents de démo avant de lancer l'éval, ou les IDs vectoriels
  sont-ils déjà en base sur l'environnement cible ?
- Mode hybrid activé par défaut (`SEARCH_MODE=hybrid`) — le laisser pour l'éval
  ou forcer `vector` seul pour avoir une baseline reproductible ?
