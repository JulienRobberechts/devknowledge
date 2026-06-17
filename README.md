# Argos — RAG Backend

![CI](https://github.com/JulienRobberechts/devknowledge/actions/workflows/ci.yml/badge.svg)

A Retrieval-Augmented Generation API for querying internal knowledge bases.

## Évaluation RAG

Lance la suite d'évaluation sur les 14 paires question/réponse du dataset de démo :

```bash
cd backend
npm run eval
```

Le script affiche un tableau de scores sur 3 métriques :

| Métrique | Description |
|----------|-------------|
| **Faithfulness** | Les faits de la réponse sont tous présents dans les chunks récupérés |
| **Answer Relevance** | La réponse répond bien à la question (similarité cosine entre embeddings) |
| **Context Recall** | Les chunks récupérés couvrent les affirmations de la réponse attendue |

### Variables d'environnement requises

Le script lit les variables depuis `backend/.env`. Les trois variables suivantes sont obligatoires :

```env
ANTHROPIC_API_KEY=sk-ant-...   # Clé API Anthropic (Claude)
VOYAGE_API_KEY=pa-...          # Clé API Voyage AI (embeddings)
DATABASE_URL=postgresql://...  # Connexion PostgreSQL avec les chunks ingérés
```

### Connexion à la base Docker locale

Le `.env` utilise `postgres` comme hostname (nom du service Docker). Pour exécuter `npm run eval` **depuis le host** (hors conteneur), il faut pointer sur `localhost` car le port 5432 est exposé par le `docker-compose.yml` :

```bash
# Démarrer les services si ce n'est pas déjà fait
docker compose up -d postgres

# Lancer l'évaluation en surchargeant DATABASE_URL
DATABASE_URL=postgresql://devknowledge:<POSTGRES_PASSWORD>@localhost:5432/devknowledge npm run eval
```

Ou modifier temporairement le `.env` en remplaçant `postgres` par `localhost` dans `DATABASE_URL` :

```env
# Pour npm run eval depuis le host :
DATABASE_URL=postgresql://devknowledge:<POSTGRES_PASSWORD>@localhost:5432/devknowledge

# Pour l'API dans Docker (valeur d'origine) :
# DATABASE_URL=postgresql://devknowledge:<POSTGRES_PASSWORD>@postgres:5432/devknowledge
```

> **Note :** Les documents de démo doivent avoir été ingérés au préalable (via l'API ou `docker compose up`) pour que les chunks soient présents en base.

---

## Limitations PDF

`pdf-parse` (backed by Mozilla PDF.js) has the following known limitations:

### Simple (linear text) PDFs
Works well for single-column, left-to-right text. Paragraph breaks and headings are preserved as whitespace. Expected accuracy: high.

### Multi-column PDFs
Column boundaries are not respected. Lines from different columns may be interleaved or merged, producing incoherent sentences. The extracted text is usable for keyword search but degrades RAG answer quality for dense column layouts.

### PDFs with tables
Table structure (rows, columns, cell alignment) is entirely lost. Cells are concatenated in reading order without delimiters. Numbers in tabular data remain searchable but the relational context (which column a value belongs to) is not recoverable from the extracted text.

### Other known limits
- Scanned PDFs (image-based) produce empty text — no OCR is applied.
- Password-protected PDFs are rejected with a parse error.
- PDFs with non-standard encoding or fonts may produce garbled Unicode characters.
- Very large PDFs (>500 pages) may be slow to ingest; consider splitting them before upload.
