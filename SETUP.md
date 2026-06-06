# Setup — Linux

## Prérequis

- Node.js >= 20
- Docker & Docker Compose
- Clés API : [Anthropic](https://console.anthropic.com) et [Voyage AI](https://www.voyageai.com)

## 1. Variables d'environnement

```bash
cd devknowledge
cp .env.example .env.local
```

Renseigner dans `.env.local` :

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Clé API Anthropic (génération de réponses) |
| `VOYAGE_API_KEY` | Clé API Voyage AI (embeddings) |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL (libre choix en dev) |
| `API_KEY` | Clé d'authentification de l'API HTTP |

Les autres variables ont des valeurs par défaut adaptées au développement.

## Option A : seulement DB en docker

### Base de données

Démarrer PostgreSQL avec pgvector :

```bash
cd devknowledge
docker compose --env-file .env.local up -d postgres
```

### Backend

```bash
cd devknowledge/backend
npm install
npm run migrate   # crée les tables et l'extension pgvector
npm run dev       # écoute sur http://localhost:3001
```

### Frontend

```bash
cd devknowledge/frontend
npm install
npm run dev       # écoute sur http://localhost:5173
```

## Option B : tout via Docker Compose

```bash
cd devknowledge
docker compose --env-file .env.local up --build
```

L'API sera disponible sur `http://localhost:3205`, le frontend sur `http://localhost:5173`.

## Lecture des logs

docker compose --env-file .env.local logs -f api



## Vérification

```bash
curl -H "x-api-key: <API_KEY>" http://localhost:3205/api/documents
# doit retourner []
```

## Tests

```bash
cd devknowledge/backend
npm test
```
