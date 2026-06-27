# Pitch: Concept Algebra

## Background

Argos uses **Voyage AI embeddings** to represent chunks of knowledge as vectors in a high-dimensional space. These vectors power hybrid search, but the semantic space they define is never exposed directly to users.

Word embeddings have a well-known geometric property: **semantic relationships are encoded as directions**. The classic demonstration:

```
King − Man + Woman ≈ Queen
Paris − France + Poland ≈ Warsaw
Paris − France + Concept ≈ Capital
Apple − English + French ≈ Pomme

Lettre − Passé + Présent ≈ Email
Carrosse − Cheval + Moteur ≈ Voiture
Bougie − Cire + Électricité ≈ Ampoule

Chaud + Intensité ≈ Brûlant
Peur + Intensité ≈ Terreur
Bleu + Foncé ≈ Bleu Marine

Chef − Cuisine + Orchestre ≈ Chef d'orchestre
Pilote − Avion + Formule 1 ≈ Pilote de course

Bouche − Humain + Oiseau ≈ Bec
Main − Humain + Lion ≈ Patte
Maison − Humain + Abeille ≈ Ruche
```

This is not a trick — it reflects that the embedding model has learned to place analogous concepts at consistent offsets in the vector space.

---

## Problem

The vector space underlying Argos is invisible. Users can search, but they cannot **explore** or **reason** about semantic relationships:

| Scenario | Today | With Concept Algebra |
|---|---|---|
| "What is the domain equivalent of X?" | Manual search | `X − general_concept + domain` |
| "Find something like X but closer to Y" | Impossible | `nearest(embed(X) + embed(Y))` |
| Cross-language concept lookup | Full text search | `Apple − English + French` |
| Analogical reasoning over the knowledge base | Not supported | `A − B + C → nearest match in KB` |

---

## Proposed Solution: Concept Algebra Explorer

A dedicated tool that accepts a **semantic equation** as input, computes the resulting vector, and returns the **nearest neighbors** in the embedding space — either in a pre-trained vocabulary or in the knowledge base itself.

### Input

A simple expression syntax:

```
King − Man + Woman
Paris − France + Poland
<concept-A> − <concept-B> + <concept-C>
```

### Output

Ranked list of nearest semantic neighbors with cosine similarity scores:

```
Result vector → nearest matches
  1. Queen        0.92
  2. Princess     0.87
  3. Duchess      0.81
```

### Two Search Targets

| Target | Embedding Model | Use Case |
|---|---|---|
| **General vocabulary** | Pre-trained (GloVe / fastText) | Classic word analogies, cross-language |
| **Knowledge base** | Voyage AI (existing) | Domain-specific concept navigation |

The first target works on a static, pre-loaded word vector index. The second target queries the existing `pgvector` store.

---

## Technology

### Embeddings

**Option A — GloVe / fastText (pre-trained, local):** Download `glove.6B.300d` or `fasttext-crawl-300d-2M`. Load into memory at startup. No API calls, zero marginal cost, works offline. Covers general vocabulary only.

**Option B — Voyage AI (existing integration):** Call `IEmbeddingPort.embed()` on each term, then compute the vector algebra on the resulting vectors. Per-query API cost. Works on any text, including multi-word phrases.

**Decision: start with Option A for word-level analogies; add Option B for KB-specific queries.**

Pre-trained vectors are the canonical tool for this use case and require no API budget. Voyage AI becomes useful when the user wants to anchor the algebra to knowledge base documents.

### Nearest Neighbor Search

- Against GloVe/fastText: in-memory brute-force cosine similarity (vocabulary ~400K entries, 300d — fits comfortably in RAM).
- Against KB: existing `pgvector` nearest-neighbour query via `IRetrieveKnowledge`.

---

## Architecture

Hexagonal structure, new use case alongside the existing RAG pipeline:

```
api/tools/
  ConceptAlgebraController.ts      ← POST /tools/concept-algebra

app/tools/
  ConceptAlgebra.ts                ← use case: parse → embed terms → arithmetic → nearest

app-ports/tools/
  IConceptAlgebra.ts               ← port interface

infra/ai/
  GloveWordVectorAdapter.ts        ← loads GloVe file; implements IWordVectorPort
  VoyageArithmeticAdapter.ts       ← uses existing IEmbeddingPort for phrase-level terms

infra-ports/ai/
  IWordVectorPort.ts               ← lookup(word): Float32Array | null
                                   ← nearestNeighbors(vector, topK): ScoredWord[]
```

**App-layer flow (`ConceptAlgebra.ts`):**

```
1. Parse expression → list of (term, sign) pairs
2. Embed each term → vector (via IWordVectorPort or IEmbeddingPort)
3. Compute result = Σ (sign × vector) for each term
4. Normalize result vector
5. Query IWordVectorPort.nearestNeighbors(result, topK)
   OR IRetrieveKnowledge with result vector
6. Return ranked list
```

---

## UI

A minimal tool page (new route `/tools/concept-algebra`):

- Text input for the equation (`King − Man + Woman`)
- Toggle: **Vocabulary** (GloVe) vs **Knowledge Base** (Voyage + pgvector)
- Results list: word / chunk title + cosine similarity score
- Optional: 2D PCA projection of the input terms + result vector (deferred)

---

## Out of Scope

- Training custom embeddings on the knowledge base corpus.
- 3D / interactive vector space visualisation (deferred to a later iteration).
- Batch / scripted analogy evaluation (can be added as a retrieval test).
- Multi-word phrase support in the GloVe path (fastText handles this natively if we switch).
