# Logs applicatifs backend — Railway

## Via l'interface Railway

1. Aller sur [railway.app](https://railway.app) → ouvrir le projet
2. Cliquer sur le service **backend**
3. Onglet **Deployments** → cliquer sur le déploiement actif
4. Section **Logs** en bas de page

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
