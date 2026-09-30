# Papote — logo et mascotte

| Fichier | Contenu |
|---|---|
| `logo.png` | le logo complet (chat + bulle « Papote »), source |
| `mascotte.png` | la planche de la mascotte : grille **4 × 4** (16 expressions), source |
| `mascotte/mascotte-<expression>.png` | les 16 expressions découpées, fond transparent |
| `logo-512.png`, `icon-*.png`, `apple-touch-icon.png`, `favicon-32.png` | générés depuis `logo.png` |
| `brand.json` | ce qui existe (lu par le serveur) |

Après avoir remplacé `logo.png` ou `mascotte.png`, régénère tout :

```bash
pip install pillow numpy scipy && python3 scripts/brand/process-brand.py
```

Le script retire le faux damier de transparence peint dans la planche (masque de
silhouette : le pelage blanc reste opaque), attribue chaque morceau (« zzz »,
étincelles, cœurs…) à sa case, et génère logo, favicon et icônes.

## Les 16 expressions (ordre de la planche, ligne par ligne)

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| ligne 1 | `happy` | `wave` | `thinking` (?) | `wink` |
| ligne 2 | `sleeping` (zzz) | `amazed` (yeux étoilés) | `curious` (se retourne) | `laughing` |
| ligne 3 | `surprised` | `cool` (lunettes) | `stretching` | `heart` |
| ligne 4 | `excited` | `peek` (se cache) | `sad` | `playful` (roule sur le dos) |

## Où elles apparaissent

| Moment | Expression |
|---|---|
| Animation d'ouverture | `sleeping` → se réveille en `amazed` |
| Écran de chargement | `sleeping` (respire) |
| Bonne réponse | `happy`, `heart` ou `laughing` |
| Mauvaise réponse | `thinking` ou `curious` — jamais triste ni moqueuse |
| Fin de quiz | `heart` (100 %), `excited`, `happy`, `thinking` (< 50 %) |
| Premium (page Premium, section Premium de l'accueil, contenus verrouillés) | `cool`, `heart` |
| « Papote écrit… » (écoute de la prononciation) | `curious` / `thinking` / `wink` en alternance + bulle à points |
| Aucun résultat / liste vide | `thinking` ou `sad` |
| Fenêtre de connexion | `wave` |
| Accueil d'une langue | `wave` |
| Révisions : rien à réviser / quota atteint / tout révisé | `sleeping` / `stretching` / `heart` |
| Nouveau badge / objectif du jour / ajout en révision | `cool` / `excited` / `wink` |

Le logo complet (`logo-512.png`) reste utilisé pour la page d'accueil et de
connexion, l'en-tête de l'application et du panneau d'administration, et sert
de base au favicon et aux icônes d'application.
