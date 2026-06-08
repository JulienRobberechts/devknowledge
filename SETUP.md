# Setup — DevKnowledge

## Prérequis

- Node.js >= 20
- Docker & Docker Compose
- Clés API : [Anthropic](https://console.anthropic.com) et [Voyage AI](https://www.voyageai.com)

## Variables d'environnement

```bash
cp .env.example .env
```

Renseigner dans `.env` :

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (génération de réponses) |
| `VOYAGE_API_KEY` | Clé API Voyage AI (embeddings) |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL (libre choix en dev) |
| `API_KEY` | Clé d'authentification de l'API HTTP |

Les autres variables ont des valeurs par défaut adaptées au développement.

---

## Déploiement local

### Option A — DB Docker + services locaux

**Base de données**

```bash
docker compose up -d postgres
```

**Backend**

```bash
cd backend
npm install
npm run migrate   # crée les tables et l'extension pgvector
npm run dev       # écoute sur http://localhost:3001
```

**Frontend**

```bash
cd frontend
npm install
npm run dev       # écoute sur http://localhost:5173
```

### Option B — Docker Compose complet

Utilise `Dockerfile.dev` (Vite dev server + tsx watch, hot-reload actif) — **à ne pas confondre avec `Dockerfile` qui sert au déploiement Railway**.

```bash
docker compose up --build
```

API disponible sur `http://localhost:3205`, frontend sur `http://localhost:5173`.

**Vérification**

```bash
curl -H "x-api-key: <API_KEY>" http://localhost:3205/api/documents
# doit retourner []
```

**Logs**

```bash
docker compose logs -f api
```

## Tests

```bash
cd backend
npm test
```

---

## Déploiement Railway (production)

Utilise `Dockerfile` (build TypeScript compilé + nginx pour le frontend) — **distinct de `Dockerfile.dev` utilisé en local**.

### 1. Prérequis

```bash
npm install -g @railway/cli
railway login
```

### 2. Créer le projet et la base PostgreSQL

```bash
railway init
railway add --plugin postgresql
```

Vérifier que pgvector est disponible :

```bash
railway run psql $DATABASE_URL -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

Si absent, activer depuis le dashboard Railway : **PostgreSQL → Variables → `PGVECTOR_ENABLED=true`**.

### 3. Variables d'environnement (dashboard Railway)

**Service API (`devknowledge-api`) :**

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | Auto-injectée par Railway |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |
| `VOYAGE_API_KEY` | Clé API Voyage AI |
| `API_KEY` | Clé d'auth prod (choisir une valeur sécurisée) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `LOG_LEVEL` | `info` |
| `CHUNKING_STRATEGY` | `sentence` |
| `CHUNK_SIZE_TOKENS` | `512` |
| `CHUNK_OVERLAP_TOKENS` | `128` |
| `RETRIEVAL_LIMIT` | `8` |
| `RETRIEVAL_MIN_SCORE` | `0.75` |
| `LLM_MAX_TOKENS` | `1024` |
| `LLM_TEMPERATURE` | `0.1` |

**Service Frontend (`devknowledge-frontend`) :**

| Variable | Valeur |
|---|---|
| `BACKEND_URL` | URL publique du service API (ex: `https://devknowledge-api.up.railway.app`) |
| `VITE_API_KEY` | Même valeur que `API_KEY` ci-dessus (build-arg Docker) |

### 4. Déployer les services

```bash
railway up --service devknowledge-api
railway up --service devknowledge-frontend
```

### 5. Lancer les migrations en production

```bash
railway run --service devknowledge-api npm run migrate:prod
```

Vérifier :

```bash
railway run --service devknowledge-api node -e \
  "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT COUNT(*) FROM documents').then(r=>console.log(r.rows[0])).finally(()=>p.end())"
```

Doit retourner `{ count: '0' }` (table vide mais présente).

### 6. Test de fumée

1. Ouvrir l'URL publique du frontend Railway
2. Uploader un PDF
3. Poser une question sur son contenu
4. Vérifier la réponse streamée
