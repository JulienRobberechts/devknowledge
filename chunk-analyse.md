# Analyse de l'impact du chunking sur la qualité de retrieval

**Document testé** : `orient-express-partie1.md` (~138 mots, un seul paragraphe dense)  
**Modèle d'embedding** : `voyage-4-lite`  
**Tests** : 10 questions en français, chacune vérifiant qu'un mot-clé attendu apparaît dans les top-K résultats retournés

---

## Configuration de référence (tous les tests passent)

```
CHUNK_SIZE   = 40   (mots)
CHUNK_OVERLAP = 5   (mots)
MIN_SCORE    = 0.0
```

---

## Impact du CHUNK_SIZE

### Structure des chunks selon la taille

| chunkSize | overlap | Nb chunks | Échecs |
|-----------|---------|-----------|--------|
| 10        | 0       | 16        | **7/11** |
| 10        | 2       | 22        | **5/11** |
| 20        | 5       | 16        | non testé |
| 30        | 5       | 11        | non testé |
| **40**    | **5**   | **10**    | **0/11 ✓** |
| 40        | 0       | 4         | 0/11 ✓ |
| 150+      | 5       | 1         | 0/11 ✓ |

### Analyse des échecs à chunkSize=10

Avec des chunks de 10 mots sans overlap, les faits sémantiquement liés se retrouvent dans des chunks séparés :

| Position dans le texte | Chunk | Contenu |
|------------------------|-------|---------|
| mots 10-20 | chunk 2 | *wagons-lits, 1883* |
| mots 20-30 | chunk 3 | *Vienne, Venise* |
| mots 30-40 | chunk 4 | *1919, Constantinople* |
| mots 40-50 | chunk 5 | *1930* |

**Exemple de rupture** : La question *"Vers quelle ville le train fut-il prolongé à partir de 1919 ?"* (mot-clé attendu : *Venise*) échoue car :
- "Venise" est dans chunk 3
- "1919" est dans chunk 4
- Le modèle d'embedding classe chunk 4 (contexte "1919") plus haut que chunk 3 → *Venise* absent du résultat top-1

L'ajout d'un overlap=2 réduit les échecs de 7 à 5 mais ne suffit pas — les chunks restent trop étroits pour maintenir la cohérence sémantique.

### Pourquoi chunkSize=40 fonctionne

Avec 40 mots, les ~43 premiers mots du document forment un seul chunk qui contient :  
**wagons-lits · 1883 · Vienne · Venise · 1919 · Constantinople · 1930**

Tous les faits de l'introduction sont colocalisés → l'embedding peut scorer correctement chaque question portant sur cette période.

> **Attention** : ce fonctionnement est "accidentellement" bon. Le chunk 1 est sémantiquement diffus (beaucoup de sujets différents), ce qui génère des scores de similarité faibles pour les questions ciblées (voir section MIN_SCORE).

---

## Impact du MIN_SCORE

Tests réalisés avec la configuration de référence (chunkSize=40, overlap=5).

### Scores de similarité observés (top-1, minScore=0.0)

| Question | Score top-1 | Résultat |
|----------|-------------|---------|
| Quelle compagnie a créé l'Orient-Express ? | 0.615 | ✓ |
| En quelle année... (1883) | 0.570* | ✓ |
| Quel style artistique... (apogée) | 0.661 | ✓ |
| En quelle année le service cessa-t-il ? (1977) | 0.708 | ✓ |
| En quelle année Constantinople... (1930) | 0.432 | ✓ |
| Quelle était la liaison initiale ? (Vienne) | 0.454 | ✓ |
| **Vers quelle ville... prolongé ? (Venise)** | **0.366** | ✓ (le plus faible) |

*résultat 2 sur 3 pour topK=3

### Seuils de rupture

| MIN_SCORE | Échecs | Questions concernées |
|-----------|--------|----------------------|
| 0.0 | 0/11 ✓ | — |
| > 0.37 | 1/11 | Venise (score 0.366, filtré) |
| > 0.43 | 2/11 | + 1930 (score 0.432) |
| > 0.45 | 3/11 | + Vienne (score 0.454) |
| > 0.5  | 3/11 | (déjà couvert) |

La question *Venise* est la plus fragile avec un score de seulement **0.366**. Cela s'explique par la taille du chunk 1 : il couvre 8 faits distincts en 272 caractères, ce qui dilue la similarité sémantique pour toute question ciblée sur un seul de ces faits.

**Marge de sécurité recommandée** : `MIN_SCORE < 0.30` pour absorber la variance entre appels à l'API d'embedding.

---

## Conclusion

### Ce qui casse les tests

1. **Chunks trop petits** (< ~20 mots) : les faits sémantiquement liés se retrouvent dans des chunks distincts. Le retrieval renvoie le chunk avec le meilleur score sémantique global, qui peut ne pas contenir le fait précis attendu.

2. **MIN_SCORE trop élevé** : le chunk correct est bien classé top-1, mais son score de similarité reste bas (~0.37–0.45) à cause de la densité informationnelle du chunk. Un seuil trop strict le filtre.

3. **Overlap insuffisant** : à chunkSize faible, un overlap de 2 ne suffit pas à bridger la séparation entre faits liés. Il faudrait overlap ≥ 5 pour chunkSize=10.

### Ce qui ne casse pas les tests

- **chunkSize très grand** (150+ → 1 seul chunk) : tous les mots-clés sont dans le même chunk, tous les tests passent trivialement, mais la précision de retrieval est nulle.
- **overlap=0 avec chunkSize=40** : les 4 chunks résultants sont assez larges pour couvrir les faits de façon cohérente.

### Trade-off fondamental

| Chunks petits | Chunks grands |
|---------------|---------------|
| Précision accrue (1 sujet/chunk) | Rappel garanti (tout dans peu de chunks) |
| Scores de similarité élevés | Scores dilués par les sujets multiples |
| Sensible aux ruptures de contexte | Robuste aux ruptures |
| Nécessite overlap plus grand | Overlap moins critique |

Pour ce document (1 paragraphe dense, ~138 mots), **chunkSize=40 est le minimum viable**. En dessous, l'overlap doit compenser — et il faut prévoir un overlap d'au moins 30–40 % de la taille du chunk.



const CHUNK_SIZE = 50; // 
const CHUNK_OVERLAP = 20; // (40% de CHUNK_SIZE)
const MIN_SCORE = 0.3; // 