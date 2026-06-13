export type Phase = "ing" | "q" | "gen" | "eval";

export interface Step {
  id: string;
  phase: Phase;
  icon: string;
  label: string;
  sub: string;
  input: { key: string; val: string };
  output: { key: string; val: string };
  annotation: string;
  formula: string | null;
  code: string;
  extra?:
    | "vector-chart"
    | "vector-chart-q"
    | "chunk-diagram"
    | "rrf-visual"
    | "token-stream";
}

export const STEPS: Step[] = [
  // ── PHASE 1: INGESTION ──────────────────────────────────
  {
    id: "extract",
    phase: "ing",
    icon: "⚙️",
    label: "Extraction du texte",
    sub: "PDF/DOCX/TXT → string brut normalisé",
    input: { key: "buffer", val: "%PDF-1.4 1 0 obj …" },
    output: {
      key: "text",
      val: '"La recherche vectorielle utilise des embeddings de haute dimension…" (14 283 chars)',
    },
    annotation:
      "pdfjs-dist pour les PDF, mammoth pour les DOCX. Le texte extrait est normalisé : suppression des espaces multiples, des headers/footers répétés, des numéros de page.",
    formula: null,
    code: `// backend/src/infrastructure/parsers/PdfParser.ts
export class PdfParser implements FileParser {
  async parse(buffer: Buffer): Promise<string> {
    const pdf   = await getDocument({ data: buffer }).promise;
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then(p => p.getTextContent())
      )
    );
    return pages
      .flatMap(p => p.items.map(i => i.str))
      .join(' ')
      .replace(/\\s+/g, ' ').trim();
  }
}`,
  },
  {
    id: "chunk",
    phase: "ing",
    icon: "✂️",
    label: "Découpage en chunks",
    sub: "Fenêtre glissante · 512 tokens · overlap 50",
    input: {
      key: "text",
      val: '"La recherche vectorielle utilise…" · 14 283 chars',
    },
    output: {
      key: "chunks",
      val: "28 chunks · ~512 tokens chacun · 50 tokens overlap",
    },
    annotation:
      "La fenêtre glissante garantit que les phrases coupées à la bordure d'un chunk restent présentes dans le suivant via l'overlap. Un chunking trop petit perd le contexte ; trop grand, les embeddings moyennent trop d'informations.",
    formula: `chunkStart(i) = i × (chunkSize - overlap)
= i × (512 - 50) = i × 462 tokens

nb_chunks ≈ ⌈(total_tokens - overlap) / (chunkSize - overlap)⌉`,
    code: `// backend/src/application/strategies/SlidingWindowChunking.ts
export class SlidingWindowChunking implements ChunkingStrategy {
  constructor(private chunkSize = 512, private overlap = 50) {}

  chunk(text: string): string[] {
    const tokens = text.split(/\\s+/);
    const stride = this.chunkSize - this.overlap;
    const chunks: string[] = [];
    for (let i = 0; i < tokens.length; i += stride) {
      chunks.push(tokens.slice(i, i + this.chunkSize).join(' '));
    }
    return chunks;
  }
}`,
    extra: "chunk-diagram",
  },
  {
    id: "embed",
    phase: "ing",
    icon: "🔢",
    label: "Génération des embeddings",
    sub: "text-embedding-ada-002 → float32[1536] × 28",
    input: { key: "chunks", val: "28 chunks · ~512 tokens chacun" },
    output: {
      key: "vectors",
      val: "28 × float32[1536] · batch de 20 chunks / appel API",
    },
    annotation:
      "L'API OpenAI est appelée par batches de 20 pour éviter les timeouts. Chaque vecteur de 1536 dimensions encode la sémantique du chunk. La distance cosinus entre deux vecteurs mesure leur similarité sémantique.",
    formula: `cosine_similarity(u, v) = (u · v) / (||u|| × ||v||)

  u · v = Σ uᵢ × vᵢ   (produit scalaire)
  ||u||  = √(Σ uᵢ²)    (norme L2)

cosine_distance = 1 - cosine_similarity ∈ [0, 2]
→ 0 = identiques   → 2 = opposés`,
    code: `// backend/src/infrastructure/ai/OpenAIEmbeddingAdapter.ts
async embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH = 20;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const { data } = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts.slice(i, i + BATCH)
    });
    results.push(...data.map(d => d.embedding));
  }
  return results;
}`,
    extra: "vector-chart",
  },
  {
    id: "store",
    phase: "ing",
    icon: "💾",
    label: "Indexation PostgreSQL",
    sub: "pgvector (HNSW) + tsvector (GIN) via trigger",
    input: { key: "data", val: "28 chunks · content + float32[1536]" },
    output: { key: "db", val: "28 rows dans chunks · index HNSW + GIN prêts" },
    annotation:
      "Un seul INSERT avec UNNEST() évite les N round-trips. Le trigger PostgreSQL calcule automatiquement ts_content = to_tsvector('french', content). L'index HNSW (Hierarchical Navigable Small World) permet une recherche vectorielle ANN en O(log N).",
    formula: `-- Index HNSW : graphe de proximité multi-couche
CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
-- m = nb connexions par nœud
-- ef_construction = taille beam search à la construction

-- Index GIN pour BM25
CREATE INDEX chunks_ts_idx ON chunks USING GIN(ts_content);`,
    code: `-- Migration : trigger auto-calcul tsvector
CREATE OR REPLACE FUNCTION chunks_tsvector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.ts_content :=
    to_tsvector('french', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chunks_tsvector_update
  BEFORE INSERT OR UPDATE ON chunks
  FOR EACH ROW EXECUTE FUNCTION
  chunks_tsvector_trigger();`,
  },

  // ── PHASE 2: QUERY ──────────────────────────────────────
  {
    id: "query-embed",
    phase: "q",
    icon: "🔢",
    label: "Embedding de la requête",
    sub: "Même modèle, même espace vectoriel que les chunks",
    input: { key: "query", val: '"Comment fonctionne la recherche hybride ?"' },
    output: { key: "vector", val: "float32[1536] = [0.023, -0.891, 0.342, …]" },
    annotation:
      "Il est critique d'utiliser le même modèle d'embedding pour la requête et les chunks. Un changement de modèle nécessite de re-indexer tous les chunks existants — c'est le \"index drift\".",
    formula: `/* Même appel API, même modèle */
query_vector = embed("Comment fonctionne la recherche hybride ?")
                     ↕ même espace ℝ¹⁵³⁶
chunk_vector = embed("La recherche hybride combine vector + BM25…")

→ cosine_distance(query_vector, chunk_vector) ≈ 0.12  ✓ proche`,
    code: `// backend/src/application/SearchKnowledge.ts
async execute({ query, limit, minScore }: SearchInput) {
  const [queryVec] = await embeddingAdapter
    .embedBatch([query]); // ← même modèle que l'ingestion

  return chunkRepo.searchHybrid({
    embedding: queryVec,
    query,        // ← pour la partie BM25
    limit,
    minScore
  });
}`,
    extra: "vector-chart-q",
  },
  {
    id: "vector-search",
    phase: "q",
    icon: "📐",
    label: "Recherche vectorielle",
    sub: "cosine_distance() ANN via index HNSW → top-20",
    input: { key: "vector", val: "float32[1536] query embedding" },
    output: { key: "results", val: "20 chunks triés par cosine_distance ↑" },
    annotation:
      'L\'index HNSW retourne les voisins les plus proches en O(log N). "ANN" = Approximate Nearest Neighbors : on accepte de manquer ~1% des résultats exacts pour gagner 100× en vitesse. ef_search contrôle ce trade-off.',
    formula: `SELECT id, content, embedding <-> $1 AS dist
FROM chunks
ORDER BY dist       -- opérateur pgvector <-> = cosine_distance
LIMIT 20;

-- ef_search = 40 (défaut) : beam search à la requête
-- Plus ef_search est grand → plus précis → plus lent`,
    code: `-- PgVectorChunkRepository.ts → searchByVector()
SELECT
  id, document_id, content,
  1 - (embedding <-> $1) AS similarity,
  ROW_NUMBER() OVER (ORDER BY embedding <-> $1) AS rank_v
FROM chunks
ORDER BY embedding <-> $1
LIMIT 20;

-- $1 = ARRAY[0.023, -0.891, 0.342, ...]::vector(1536)`,
  },
  {
    id: "bm25",
    phase: "q",
    icon: "📊",
    label: "Recherche BM25 / Full-text",
    sub: "to_tsquery() + ts_rank_cd() via index GIN → top-20",
    input: { key: "query", val: '"Comment fonctionne la recherche hybride ?"' },
    output: { key: "results", val: "20 chunks triés par ts_rank_cd ↓" },
    annotation:
      'BM25 excelle là où la similarité vectorielle échoue : noms propres, acronymes, identifiants techniques. "RAG", "pgvector", "HNSW" ne sont pas dans le vocabulaire d\'un embedding générique — BM25 les retrouve exactement.',
    formula: `BM25(D, Q) = Σ_t IDF(t) × TF(t,D) × (k₁+1) / (TF(t,D) + k₁×(1-b+b×|D|/avgdl))

PostgreSQL ts_rank_cd ≈ BM25 :
  IDF(t) = log((N - df + 0.5) / (df + 0.5))
  cd = cover density ranking (proximité des termes)`,
    code: `-- PgVectorChunkRepository.ts → searchByBM25()
SELECT
  id, document_id, content,
  ts_rank_cd(ts_content, query) AS bm25_score,
  ROW_NUMBER() OVER (
    ORDER BY ts_rank_cd(ts_content, query) DESC
  ) AS rank_bm25
FROM chunks,
  to_tsquery('french', $1) query
WHERE ts_content @@ query
ORDER BY bm25_score DESC
LIMIT 20;`,
  },
  {
    id: "rrf",
    phase: "q",
    icon: "⚖️",
    label: "Fusion RRF",
    sub: "Reciprocal Rank Fusion · k=60 · union des deux listes",
    input: {
      key: "listes",
      val: "top-20 vector + top-20 BM25 (40 chunks, potentiellement dédupliqués)",
    },
    output: {
      key: "ranked",
      val: "top-10 chunks fusionnés par score RRF décroissant",
    },
    annotation:
      "RRF est indépendant de l'échelle des scores (cosine ∈ [0,1] et ts_rank ∈ [0,1] mais non comparables). k=60 est la valeur standard : un document en position 1 vaut 1/61 ≈ 0.016, en position 60 vaut 1/120 ≈ 0.008.",
    formula: `RRF(d) = 1/(k + rank_vector(d))
           + 1/(k + rank_bm25(d))

avec k = 60 (constante de lissage)

Si d absent d'une liste → rang = ∞ → contribution = 0`,
    code: `-- Fusion RRF dans une seule query SQL
WITH
  v AS (... /* vector search */),
  b AS (... /* BM25 search  */)
SELECT
  COALESCE(v.id, b.id) AS id,
  COALESCE(v.content, b.content) AS content,
  (  1.0 / (60 + COALESCE(v.rank_v,    1000))
   + 1.0 / (60 + COALESCE(b.rank_bm25, 1000))
  ) AS rrf_score
FROM v FULL OUTER JOIN b USING (id)
ORDER BY rrf_score DESC
LIMIT 10;`,
    extra: "rrf-visual",
  },
  {
    id: "rerank",
    phase: "q",
    icon: "🎯",
    label: "Re-ranking (cross-encoder)",
    sub: "Voyage AI rerank-2 · paire (query, chunk) → score précis",
    input: { key: "chunks", val: "top-10 chunks après RRF" },
    output: {
      key: "reranked",
      val: "top-5 chunks reordonnés par pertinence précise",
    },
    annotation:
      "Le bi-encoder (embedding) encode query et chunk séparément → approximatif. Le cross-encoder les regarde ensemble → précis mais 100× plus lent. On l'applique uniquement sur les top-10 RRF pour garder la latence faible.",
    formula: `Bi-encoder  : score(q,d) = sim(embed(q), embed(d))
                             ↑ rapide mais découplé

Cross-encoder: score(q,d) = model([CLS] q [SEP] d [SEP])
                             ↑ joint → précis mais O(N)

Stratégie : bi-encoder pour filtrer → cross-encoder pour classer
            (retrieve & rerank pattern)`,
    code: `// backend/src/infrastructure/reranking/VoyageRerankAdapter.ts
async rerank(
  query: string,
  documents: string[]
): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/rerank', {
    method: 'POST',
    body: JSON.stringify({
      model:     'rerank-2',
      query,
      documents,
      top_k:     5
    })
  });
  const { results } = await res.json();
  return results.map(r => r.index); // indices triés
}`,
  },
  {
    id: "context",
    phase: "q",
    icon: "📝",
    label: "Construction du contexte",
    sub: "System prompt + chunks + historique + query → prompt final",
    input: {
      key: "chunks",
      val: "5 chunks pertinents · historique 4 échanges",
    },
    output: {
      key: "prompt",
      val: "~3 200 tokens · system + sources + history + query",
    },
    annotation:
      "Chaque chunk est formaté comme \"SOURCE N: [contenu]\" pour que le LLM puisse citer ses sources. L'ordre des chunks dans le prompt a de l'importance (lost-in-the-middle : les LLMs oublient le milieu d'un long contexte).",
    formula: `Structure du prompt :
┌─ SYSTEM ──────────────────────────────────────────┐
│ Tu es un assistant expert. Réponds uniquement     │
│ à partir des sources ci-dessous.                  │
├─ SOURCES ─────────────────────────────────────────┤
│ SOURCE 1: La recherche hybride combine…           │
│ SOURCE 2: Le RRF (Reciprocal Rank Fusion)…        │
├─ HISTORIQUE ──────────────────────────────────────┤
│ User: Qu'est-ce que pgvector ?                    │
│ Assistant: pgvector est une extension…            │
├─ QUERY ───────────────────────────────────────────┤
│ Comment fonctionne la recherche hybride ?         │
└───────────────────────────────────────────────────┘`,
    code: `// backend/src/application/AskQuestion.ts
function buildPrompt(chunks: Chunk[], history: Message[], query: string) {
  const sources = chunks
    .map((c, i) => \`SOURCE \${i+1}: \${c.content}\`)
    .join('\\n\\n');

  return [
    { role: 'system', content: \`\${SYSTEM_PROMPT}\\n\\n\${sources}\` },
    ...history.flatMap(m => [
      { role: 'user',      content: m.userMessage },
      { role: 'assistant', content: m.assistantMessage }
    ]),
    { role: 'user', content: query }
  ];
}`,
  },
  {
    id: "llm",
    phase: "gen",
    icon: "🤖",
    label: "Génération LLM",
    sub: "claude-sonnet-4-6 · streaming SSE token par token",
    input: { key: "prompt", val: "~3 200 tokens · messages array" },
    output: { key: "stream", val: "tokens en streaming → callback onToken()" },
    annotation:
      "Le streaming permet d'afficher les premiers mots avant que la réponse complète soit générée. Sans streaming, l'utilisateur attend 3-8 secondes. Avec streaming, la latence perçue tombe à <500ms pour le premier token (TTFT).",
    formula: `TTFT  = Time To First Token  → latence perçue par l'user
TPOT  = Time Per Output Token → vitesse de génération
Latence totale = TTFT + TPOT × nb_tokens_output

Avec streaming SSE :
  affichage ≈ TTFT ≈ 300-800ms
  sans streaming :
  affichage ≈ TTFT + TPOT × 200 ≈ 3-8s`,
    code: `// backend/src/infrastructure/ai/ClaudeAdapter.ts
async generate({ messages, onToken }: LLMInput) {
  const stream = await anthropic.messages.stream({
    model:      'claude-sonnet-4-6',
    max_tokens: 1024,
    messages
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta'
     && event.delta.type === 'text_delta') {
      onToken(event.delta.text); // ← SSE vers le client
    }
  }
}`,
    extra: "token-stream",
  },
  {
    id: "faithfulness",
    phase: "eval",
    icon: "🔬",
    label: "Évaluation RAGAS — fidélité",
    sub: "Atomic statements vs sources · score ∈ [0,1] · détection hallucinations",
    input: {
      key: "data",
      val: "réponse LLM + 5 chunks sources",
    },
    output: {
      key: "score",
      val: "faithfulness_score = 0.94 · 7/8 statements ancrés dans les sources",
    },
    annotation:
      "RAGAS faithfulness décompose la réponse en atomic statements (propositions atomiques), puis vérifie chacune contre les sources via un LLM-judge. Un score < 0.5 signale une hallucination probable. Ce score est persisté et agrégé sur un dashboard de monitoring pour détecter les dérives de qualité sur 24h. Seuil d'alerte : score moyen < 0.75.",
    formula: `faithfulness = |statements supportés par les sources|
             ──────────────────────────────────────────
                     |total atomic statements|

Exemple de décomposition :
  ① "La recherche hybride combine vectorielle + BM25"  → SOURCE 1 ✓
  ② "RRF fusionne les rangs avec k=60"                 → SOURCE 2 ✓
  ③ "k=60 élimine les biais d'échelle"                 → SOURCE 2 ✓
  ④ "pgvector est basé sur FAISS en interne"           → ∅ ✗ hallucination

  score = 3 / 4 = 0.75  ← alerte si < 0.75 sur 24h`,
    code: `// backend/src/application/evaluation/RagasEvaluator.ts
export class RagasEvaluator {
  async faithfulness(
    response: string,
    sources:  string[]
  ): Promise<number> {
    // 1. Décomposer la réponse en atomic statements
    const statements = await this.llm.extract(\`
      Décompose en propositions atomiques : \${response}
    \`);
    // 2. Vérifier chaque statement contre les sources
    let supported = 0;
    for (const stmt of statements) {
      const ok = await this.llm.verify(\`
        Est-ce supporté par les sources ?
        Statement: "\${stmt}"
        Sources: \${sources.join('\\n---\\n')}
      \`);
      if (ok) supported++;
    }
    return supported / statements.length;
  }
}`,
  },
  {
    id: "citation-forcing",
    phase: "eval",
    icon: "📎",
    label: "Citation forcing",
    sub: "LLM forcé à citer · vérification précision des références",
    input: { key: "data", val: "réponse LLM + chunks numérotés [SOURCE N]" },
    output: {
      key: "score",
      val: "citation_precision = 0.89 · 8/9 références ancrées",
    },
    annotation:
      "Citation forcing oblige le modèle à baliser chaque affirmation avec [SOURCE N]. On vérifie ensuite que chaque citation renvoie bien à une source qui contient cette information. Détecte les citations inventées : le modèle écrit [SOURCE 3] alors que SOURCE 3 ne contient pas le fait cité.",
    formula: `citation_precision = |citations valides| / |total citations dans la réponse|

Exemple :
  "La recherche hybride combine vectorielle + BM25 [SOURCE 1]"
    → SOURCE 1 contient bien cette info ✓
  "pgvector est basé sur FAISS en interne [SOURCE 2]"
    → SOURCE 2 ne contient pas cette info ✗ hallucination

  precision = 1/2 = 0.50 ← alerte`,
    code: `// Citation forcing scorer
async citationPrecision(
  response: string,
  sources: Record<number, string>
): Promise<number> {
  // Extraire les paires (affirmation, numéro source) via regex
  const cited = [...response.matchAll(/([^.]+)\\[SOURCE (\\d+)\\]/g)]
    .map(m => ({ claim: m[1].trim(), src: Number(m[2]) }));
  let valid = 0;
  for (const { claim, src } of cited) {
    const ok = await this.llm.verify(\`
      Est-ce que ce claim est supporté par la source ?
      Claim: "\${claim}"
      Source: "\${sources[src] ?? ''}"
      Réponds UNIQUEMENT avec du JSON : {"supported": true|false}
    \`);
    if (ok) valid++;
  }
  return cited.length ? valid / cited.length : 1;
}`,
    extra: undefined,
  },
  {
    id: "counterfactual",
    phase: "eval",
    icon: "🔄",
    label: "Counterfactual",
    sub: "Contexte modifié → mesure de sensibilité au RAG",
    input: {
      key: "data",
      val: "chunks originaux + version perturbée (fait erroné injecté)",
    },
    output: {
      key: "delta",
      val: "sensitivity = 0.73 · réponse a bien changé avec le contexte",
    },
    annotation:
      "L'évaluation counterfactual remplace un fait clé dans les sources (ex : '1883' → '1901') et relance le pipeline complet. Si la réponse ne change pas, le modèle ignore les sources et répond depuis sa mémoire paramétrique — signe de mémorisation plutôt que de retrieval. Un bon RAG doit être 'context-faithful'.",
    formula: `sensitivity = 1 - cosine_sim(response_original, response_modifiée)

→ sensitivity ≈ 0 : réponse identique → modèle ignore le contexte ✗
→ sensitivity ≈ 1 : réponse change    → modèle suit le contexte     ✓

Seuil recommandé : sensitivity > 0.40 pour valider le grounding`,
    code: `// Counterfactual evaluation
async counterfactual(
  question:       string,
  originalChunks: Chunk[],
  perturbedChunks: Chunk[]  // chunks avec un fait modifié
): Promise<number> {
  const r1 = await this.ask(question, originalChunks);
  const r2 = await this.ask(question, perturbedChunks);
  const [e1, e2] = await this.embed([r1, r2]);
  // sensitivity élevée → le modèle suit bien les sources
  return 1 - cosineSimilarity(e1, e2);
}`,
    extra: undefined,
  },
];

export const INGESTION_STEPS = STEPS.filter((s) => s.phase === "ing");
export const QUERY_STEPS = STEPS.filter((s) => s.phase === "q");
export const GEN_STEPS = STEPS.filter((s) => s.phase === "gen");
export const EVAL_STEPS = STEPS.filter((s) => s.phase === "eval");
