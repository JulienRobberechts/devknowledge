# Logs applicatifs backend — Railway

## Via l'interface Railway

### Logs runtime (stdout/stderr de l'application)

**Option 1 — Log Explorer (recommandé)**
1. Ouvrir le projet sur [railway.app](https://railway.app)
2. Cliquer sur **Observability** dans la navigation supérieure
3. Le Log Explorer affiche les logs runtime de tous les services, avec filtres

**Option 2 — Par déploiement**
1. Cliquer sur le service **backend**
2. Onglet **Deployments** → cliquer sur le déploiement actif
3. Sélectionner l'onglet **Deploy Logs** (≠ Build Logs qui ne montre que la compilation)

## Via CLI Railway

```bash
# Installer la CLI si besoin
npm install -g @railway/cli

# S'authentifier
railway login

# Streamer les logs en live (streaming par défaut)
railway logs

# Logs d'un service spécifique
railway logs --service devknowledge-api
```

## Format des logs

En production, les logs sont en JSON brut (pino sans pretty-print) :

```json
{"level":30,"time":1234567890,"component":"IngestDocument","msg":"Document ingested"}
```

Pour parser en local :

```bash
railway logs | npx pino-pretty
```

## Niveau de log

Contrôlé par la variable d'environnement `LOG_LEVEL` (défaut : `info`).

Valeurs possibles : `debug` | `info` | `warn` | `error`

Pour activer les logs debug → ajouter dans Railway > service > Variables :
```
LOG_LEVEL=debug
```
