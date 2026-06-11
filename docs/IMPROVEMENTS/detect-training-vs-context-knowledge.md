# Détecter si une réponse LLM vient de l'entraînement ou du contexte RAG

## Contexte

Dans ce projet RAG, le problème observé : pour la question *"Quand a commencé l'Orient-Express ?"*, le LLM génère une réponse correcte ("1883", "Nagelmackers") en puisant dans ses données d'entraînement plutôt que dans les chunks récupérés — qui n'ont pas de score de similarité suffisant pour contenir l'information clé.

Question sous-jacente : **peut-on savoir, pour une réponse donnée, si elle vient de la connaissance paramétrique du LLM ou des documents fournis en contexte ?**

---

## Pourquoi c'est fondamentalement difficile

La recherche en interprétabilité mécanistique (2025) montre que :

> *"Parametric and contextual knowledge are routed through largely distinct attention circuits and coexist as superposed signals, with conflicts resolved through differential accumulation of signal strength across layers"*

Les deux types de connaissance coexistent dans les mêmes couches du réseau, en signaux superposés. Il n'y a pas de registre séparé "je lis le doc" vs "je me souviens". Le LLM blend les deux sources dans la même passe de génération.

---

## Les 3 familles d'approches

### 1. Boîte noire — applicable à Claude/GPT-4 via API

#### a) Faithfulness scoring — RAGAS

Après génération, un LLM-juge décompose la réponse en claims atomiques, puis vérifie pour chaque claim s'il est supporté par les chunks récupérés.

```
Score faithfulness = claims supportés / total claims
```

Si score < 1.0 → certains claims viennent probablement de la connaissance paramétrique.

**Pour l'Orient-Express** : les claims "1883" et "Nagelmackers" ne sont pas dans les chunks → score = 0 → signal clair que la réponse vient de l'entraînement.

```python
from ragas.metrics import faithfulness
from ragas import evaluate

result = evaluate(
    dataset,  # question, answer, contexts, ground_truth
    metrics=[faithfulness]
)
# faithfulness score entre 0 et 1
```

#### b) Test contrefactuel (comparaison avec/sans contexte)

Générer la réponse deux fois :
- **Avec** les chunks récupérés → réponse A
- **Sans** contexte (question brute) → réponse B

```
Si A ≈ B  → le LLM a utilisé sa connaissance d'entraînement
Si A ≠ B  → le LLM a utilisé le contexte fourni
```

C'est une formalisation du test Jensen-Shannon Divergence sur les distributions de tokens (papier 2025 : *"Attributing Response to Context: A JSD-Driven Mechanistic Study"*). Applicable avec `logprobs` (disponible chez OpenAI, partiel chez Anthropic).

#### c) Forçage de citation

Prompter le LLM à citer le chunk exact pour chaque claim factuel :

```
"Pour chaque fait que tu mentionnes, cite la phrase exacte du document source.
Si tu ne trouves pas de source dans les documents fournis, indique [CONNAISSANCE PROPRE]."
```

Si le LLM produit `[CONNAISSANCE PROPRE]` → signal explicite.

**Limite** : les LLMs hallucinent des citations. Il faut vérifier que la citation existe réellement dans les chunks.

#### d) Injection de conflit (test de sensibilité)

Insérer délibérément une version légèrement modifiée dans les documents :

```
Document injecté : "L'Orient-Express a commencé à circuler en 1887..."
```

- Si le LLM suit le document → il a utilisé le contexte
- Si le LLM répond 1883 → il a utilisé l'entraînement

Utile en mode test/évaluation pour mesurer le degré de dépendance paramétrique.

---

### 2. Boîte blanche — modèles open-source uniquement (Llama, Mistral, etc.)

#### a) Analyse d'attention + MLP

La connaissance contextuelle circule via les **têtes d'attention** sur les tokens du contexte.
La connaissance paramétrique est stockée dans les **couches MLP** (feed-forward).

On peut mesurer :
- Attention scores sur les tokens des chunks vs les tokens de la question
- Attribution par gradient (Integrated Gradients) pour tracer quelle partie du contexte a influencé chaque token généré

Papier 2025 : *"Probing for Knowledge Attribution in Large Language Models"* — entraîne un classifieur sur les états cachés pour prédire "vient du contexte" vs "vient de l'entraînement".

#### b) Self-RAG — tokens de réflexion intégrés

Un modèle fine-tuné (Self-RAG) génère des tokens spéciaux pendant l'inférence :

```
[Retrieve]   → décide si récupérer
[IsRel]      → le chunk est-il pertinent ?
[IsSup]      → le chunk supporte-t-il la réponse ?
[IsUse]      → la réponse est-elle utile ?
```

Signal **inline et explicite** sur l'utilisation du contexte.

**Limite** : nécessite un modèle spécifiquement entraîné — pas applicable à Claude via API.

---

### 3. Approches hybrides

#### Décodage contrastif

Comparer les logits avec et sans contexte pour amplifier ou détecter la contribution du contexte. Partiellement possible via `logprobs` avec l'API OpenAI.

Papier 2025 : *"From Context-Aware to Conflict-Aware: Generalizing Contrastive Decoding for Knowledge Conflict in LLMs"*

#### Two-stage conflict detection (FaithfulRAG, 2025)

1. Extraire la connaissance paramétrique via **self-consistency** (poser la question sans contexte plusieurs fois, consensus = connaissance d'entraînement)
2. Comparer ce consensus avec la réponse générée avec les chunks
3. Divergence → conflit → signaler la source

---

## Synthèse comparative

| Méthode | API closed-source | Certitude | Coût |
|---|---|---|---|
| RAGAS faithfulness | ✅ | Moyenne | 1 appel LLM |
| Comparaison avec/sans contexte | ✅ | Bonne | 2× latence |
| Forçage de citation | ✅ | Moyenne | Prompt engineering |
| Injection de conflit | ✅ (test uniquement) | Bonne | Infra test |
| Attention/MLP analysis | ❌ open-source only | Très bonne | Compute GPU |
| Self-RAG tokens | ❌ modèle dédié | Excellente | Fine-tuning |
| Probing classifiers | ❌ open-source only | Bonne | Labeling + entraînement |

---

## Recommandation pour ce projet RAG

Ce qui est implémentable **maintenant** dans `SearchKnowledge.ts`, en complément des améliorations de ranking (BM25 + reranking) :

### Étape 1 — Check de faithfulness post-génération

```typescript
const faithfulnessPrompt = `
Tu as reçu cette question : "${query}"
Tu as accès à ces sources : ${chunks.map(c => c.content).join('\n---\n')}
Tu as généré cette réponse : "${answer}"

Pour chaque affirmation factuelle dans la réponse, indique :
- SUPPORTÉ : si la source contient explicitement cette information
- HORS-SOURCE : si cette information ne vient pas des documents fournis

Format JSON: { "claims": [{ "claim": "...", "status": "SUPPORTÉ|HORS-SOURCE", "source_excerpt": "..." }] }
`;
```

### Étape 2 — Exposer le signal dans l'API

```typescript
interface SearchResult {
  answer: string;
  chunks: ChunkSearchResult[];
  faithfulness: {
    score: number;       // 0-1
    claims: Claim[];     // chaque claim avec sa source
    warning?: string;    // "Réponse partiellement basée sur les données d'entraînement"
  };
}
```

Ce signal permet de :
- Afficher un avertissement dans l'UI quand la réponse n'est pas ancrée dans les documents
- Logger les cas résiduels pour identifier les lacunes du retrieval
- Déclencher automatiquement une stratégie de fallback (ex. : HyDE ou requête reformulée)

---

## Sources

- [Attributing Response to Context: JSD-Driven Mechanistic Study (2025)](https://arxiv.org/pdf/2505.16415)
- [Probing for Knowledge Attribution in Large Language Models (2025)](https://arxiv.org/pdf/2602.22787)
- [FaithfulRAG: Fact-Level Conflict Modeling (2025)](https://arxiv.org/html/2506.08938v1)
- [From Context-Aware to Conflict-Aware: Contrastive Decoding (2025)](https://arxiv.org/html/2606.10298)
- [Ragas: Automated Evaluation of RAG](https://arxiv.org/pdf/2309.15217)
- [Faithfulness metric — Ragas docs](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)
- [Studying LLM Behaviors Under Context-Memory Conflicts (2024)](https://arxiv.org/pdf/2404.16032)
- [Understanding Parametric vs Contextual Knowledge — ECIR 2025](https://arxiv.org/pdf/2603.09654)
- [Benchmarking LLM Faithfulness in RAG (2025)](https://arxiv.org/abs/2505.04847)
