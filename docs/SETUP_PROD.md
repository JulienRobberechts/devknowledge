# Setup — Déploiement Railway (production)

Utilise `Dockerfile` (build TypeScript compilé + nginx pour le frontend) — **distinct de `Dockerfile.dev` utilisé en local**.

## 1. Prérequis

```bash
npm install -g @railway/cli
railway login
```

## 2. Créer le projet et la base PostgreSQL

```bash
railway init # Then Type the name of your project argos

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

Si absent, le service PostgreSQL Railway ne supporte pas pgvector — utiliser le template **pgvector** depuis le dashboard Railway : **New Service → Database → pgvector**.

## 3. Créer le service API

`railway up` ne crée pas automatiquement un service — il faut d'abord le créer explicitement :

```bash
railway add  # choisir "Empty Service", nommer "argos-api"
```

La CLI demande de saisir les variables :

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_PUBLIC_URL=${{Postgres.DATABASE_PUBLIC_URL}}
ANTHROPIC_APP_PASSWORD=<>
VOYAGE_APP_PASSWORD=<>
APP_PASSWORD=<>
PORT=3001
NODE_ENV=production
LOG_LEVEL=debug
CHUNKING_STRATEGY=sentence
CHUNK_SIZE_TOKENS=512
CHUNK_OVERLAP_TOKENS=128
RETRIEVAL_LIMIT=8
RETRIEVAL_MIN_SCORE=0.10
LLM_MAX_TOKENS=1024
```

> `${{Postgres.DATABASE_URL}}` est une variable de référence Railway — elle injecte automatiquement l'URL du service PostgreSQL créé à l'étape 2.

## 4. Exposer le port de l'API (obligatoire)

> **Sans domaine public configuré, Railway ne route pas le port et tue le container après ~18s (health check timeout). Le service redémarre en boucle.**

Dans le dashboard Railway → service **argos-api** → **Settings** → **Networking** → **Generate Domain**.

Cela crée la variable `RAILWAY_PUBLIC_DOMAIN` et expose le port `3001`.

## 5. Premier déploiement de l'API

Dans le dashboard Railway → service **argos-api** → **Settings** → **Source** → **Root Directory** :
Mettre "/backend"

```bash
cd argos/backend
railway up --service argos-api
```

## 6. Créer et déployer le frontend

`railway up` ne crée pas automatiquement un service — il faut d'abord le créer explicitement :

```bash
railway add  # choisir "Empty Service", nommer "argos-frontend"
```

Variables à saisir :

```env
BACKEND_URL=http://${{argos-api.RAILWAY_PRIVATE_DOMAIN}}:3001
```

> `${{argos-api.RAILWAY_PRIVATE_DOMAIN}}` est une variable de référence Railway — elle injecte le domaine privé du service API (réseau interne Railway, pas de frais d'egress). Utiliser le domaine **privé** (HTTP, port 3001) et non le domaine public pour éviter les frais de transit.

Puis déployer :

Dans le dashboard Railway → service **argos-frontend** → **Settings** → **Source** → **Root Directory** :
Mettre "/frontend"

```bash
cd argos/frontend
railway up --service argos-frontend
```

Dans le dashboard Railway → service **argos-frontend** → **Settings** → **Networking** → **Generate Domain** port 80.

## 7. Lancer les migrations en production

`railway run` s'exécute en local : `DATABASE_URL` pointe vers le réseau privé Railway (`*.railway.internal`), inaccessible hors du réseau Railway. Il faut overrider avec `DATABASE_PUBLIC_URL` :

```bash
cd argos/backend
npm run build
railway run --service argos-api sh -c 'DATABASE_URL=$DATABASE_PUBLIC_URL node dist/infra/db/migrate.js'
```

Vérifier :

```bash
railway run --service argos-api sh -c \
  'DATABASE_URL=$DATABASE_PUBLIC_URL node -e "const {Pool}=require(\"pg\");const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT COUNT(*) FROM documents\").then(r=>console.log(r.rows[0])).finally(()=>p.end())"'
```

Doit retourner `{ count: '0' }` (table vide mais présente).

## 8. Test de fumée (premier déploiement)

1. Obtenir l'URL du frontend :
   ```bash
   railway domain -s argos-frontend --json
   ```
   Ouvrir l'URL retournée (ex: `https://argos-frontend-production.up.railway.app`)
2. Uploader un PDF
3. Poser une question sur son contenu
4. Vérifier la réponse streamée

---

## Redéploiement

Pour pousser des modifications sur un projet Railway **déjà configuré** (pas de création de service ni de variables à renseigner).

### Prérequis

```bash
railway link   # si le terminal n'est pas encore lié au projet
```

### API

```bash
cd argos/backend
railway up --service argos-api
```

### Frontend

```bash
cd argos/frontend
railway up --service argos-frontend
```

### Migrations (si le schéma a changé)

À exécuter après le redéploiement de l'API :

```bash
cd argos/backend
npm run build
railway run --service argos-api sh -c 'DATABASE_URL=$DATABASE_PUBLIC_URL node dist/infra/db/migrate.js'
```

### Tout redéployer d'un coup

```bash
cd argos/backend && railway up --service argos-api && \
cd ../frontend && railway up --service argos-frontend
```

### Vérification rapide

```bash
# Logs de l'API (Ctrl+C pour quitter)
railway logs --service argos-api

# URL du frontend
railway domain -s argos-frontend --json
```
