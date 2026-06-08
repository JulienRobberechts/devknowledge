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

Depuis le répertoire devknowledge:

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
railway init # Then Type the name of your project

railway link # Then Select the project

railway add --database postgres
```

Activer le réseau public PostgreSQL (nécessaire pour les migrations en local) :

> **Dashboard Railway → PostgreSQL → Settings → Networking → Generate Domain**

Cela crée la variable `DATABASE_PUBLIC_URL` accessible depuis l'extérieur du réseau Railway.

Vérifier que pgvector est disponible :

```bash
# Installer le client PostgreSQL si absent
sudo apt install -y postgresql-client

export DATABASE_PUBLIC_URL=$(railway run printenv DATABASE_PUBLIC_URL)
psql "$DATABASE_PUBLIC_URL" -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

Si absent, activer depuis le dashboard Railway : **PostgreSQL → Variables → `PGVECTOR_ENABLED=true`**.

### 3. Créer le service API

`railway up` ne crée pas automatiquement un service — il faut d'abord le créer explicitement :

```bash
railway add --service devknowledge-api
```

La CLI demande de saisir les variables :

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
ANTHROPIC_API_KEY=<>
VOYAGE_API_KEY=<>
API_KEY=<>
PORT=3205
NODE_ENV=production
LOG_LEVEL=debug
CHUNKING_STRATEGY=sentence
CHUNK_SIZE_TOKENS=512
CHUNK_OVERLAP_TOKENS=128
RETRIEVAL_LIMIT=8
RETRIEVAL_MIN_SCORE=0.10
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.1
```

> `${{Postgres.DATABASE_URL}}` est une variable de référence Railway — elle injecte automatiquement l'URL du service PostgreSQL créé à l'étape 2.

### 4. Premier déploiement de l'API

```bash
cd devknowledge/backend
railway up --service devknowledge-api
```

### 5. Créer et déployer le frontend

`railway up` ne crée pas automatiquement un service — il faut d'abord le créer explicitement :

```bash
railway add --service devknowledge-frontend
```

Variables à saisir :

```env
BACKEND_URL=https://${{devknowledge-api.RAILWAY_PUBLIC_DOMAIN}}
VITE_API_KEY=<même valeur que API_KEY>
```

> `${{devknowledge-api.RAILWAY_PUBLIC_DOMAIN}}` est une variable de référence Railway — elle injecte automatiquement le domaine public du service API.
> `VITE_API_KEY` est une variable **build-time** (Docker `ARG`) : elle est intégrée dans le bundle JS à la compilation, pas à l'exécution.

Puis déployer :

```bash
cd devknowledge/frontend
railway up --service devknowledge-frontend
```

### 6. Lancer les migrations en production

`railway run` s'exécute en local : `DATABASE_URL` pointe vers le réseau privé Railway (`*.railway.internal`), inaccessible hors du réseau Railway. Il faut overrider avec `DATABASE_PUBLIC_URL` :

```bash
cd devknowledge/backend
npm run build
railway run --service devknowledge-api sh -c 'DATABASE_URL=$DATABASE_PUBLIC_URL node dist/infrastructure/db/migrate.js'
```

Vérifier :

```bash
railway run --service devknowledge-api sh -c \
  'DATABASE_URL=$DATABASE_PUBLIC_URL node -e "const {Pool}=require(\"pg\");const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT COUNT(*) FROM documents\").then(r=>console.log(r.rows[0])).finally(()=>p.end())"'
```

Doit retourner `{ count: '0' }` (table vide mais présente).

### 7. Test de fumée

1. Obtenir l'URL du frontend :
   ```bash
   railway domain -s devknowledge-frontend --json
   ```
   Ouvrir l'URL retournée (ex: `https://devknowledge-frontend-production.up.railway.app`)
2. Uploader un PDF
3. Poser une question sur son contenu
4. Vérifier la réponse streamée
