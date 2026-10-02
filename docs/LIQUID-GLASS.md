# Pap’pote — Liquid Glass (iOS 27)

Le matériau « Liquid Glass » d'iOS 26/27, adapté au web, appliqué à toutes les
surfaces de Pap’pote. Deux fichiers :

| Fichier | Rôle |
|---|---|
| `design-system/liquid-glass.css` | Le matériau (jetons, recettes « flottante » et « légère », réfraction, barre uniforme, animations, accessibilité, curseur). Chargé sur toutes les pages après `papote.css`, avant `responsive.css`. |
| `design-system/liquid-glass.js` | Le comportement : curseur de transparence (`PapoteGlass`), lentille de réfraction, ondulations au toucher, « goutte » de la barre d'onglets, barre uniforme au défilement, qualité adaptative. |

Pas de dépendance : Pap’pote est écrit en JavaScript natif, sans React. Le
paquet npm `@ios27_design_system/react` (v1.0.0) a été évalué mais n'est pas
utilisé : il imposerait React à toute l'application pour quelques composants.
Le rendu est reproduit ici en CSS/JS natif, sur les mêmes principes.

## 1. Les cinq ingrédients optiques

Tout est obtenu sur l'élément lui-même, sans balisage supplémentaire :

1. **Translucidité + flou** — teinte `rgba(--lg-tint, --lg-alpha)` +
   `backdrop-filter: blur(--lg-blur) saturate(1.9)`.
2. **Réfraction** — sur Chromium (Chrome, Edge, Samsung Internet, WebView
   Android), l'arrière-plan passe d'abord dans une lentille SVG
   (`feTurbulence` + `feDisplacementMap`) avant d'être flouté : le fond est
   déplacé, pas seulement adouci. Safari et Firefox ne savent pas appliquer un
   filtre SVG dans `backdrop-filter` : ils gardent le flou (repli propre).
3. **Aberration chromatique** — fines franges rouge / bleue sur les bords
   gauche et droit (ombres internes colorées).
4. **Lumière spéculaire** — liseré lumineux en haut, bord de Fresnel plus
   brillant aux coins (bordure en dégradé), reflet doux en haut à gauche ; bord
   inférieur assombri pour la profondeur (nouveauté iOS 27).
5. **Mouvement** — apparitions en « morphing » (échelle + flou qui se
   résorbent), pression qui écrase la surface comme une goutte puis la relâche
   avec un ressort, ondulation de lumière au point de contact, sélection de la
   barre d'onglets qui glisse comme une goutte. Comme dans iOS 27, **aucun
   reflet ne suit l'inclinaison** de l'appareil (supprimé pour éviter le vertige).

## 2. Deux recettes

| Recette | Classes / surfaces | Flou réel |
|---|---|---|
| **Flottante** | `.lg`, `.lg-float`, `.lg-sheet` ; barre du haut, barre d'onglets, en-têtes, menus et barre latérale, fenêtre de connexion, notifications, bulle « lecture audio », barre de quiz | oui (+ réfraction sur Chromium) |
| **Légère** | `.lg-lite` ; cartes, lignes de vocabulaire, cartes de quiz, réponses, boîtes, cartes de l'accueil, comparatif Premium, FAQ | non : ces cartes sont posées sur le fond de page, le flou n'apporterait rien et coûterait du GPU |

Pour habiller un nouvel élément : ajouter `class="lg-float"` (surface qui
flotte au-dessus du contenu) ou `class="lg-lite"` (carte dans une liste).

## 3. Curseur de transparence (comme les Réglages d'iOS 27)

- **Où** : Profil (`/profile`, carte « Apparence · Liquid Glass ») et profil de
  chaque langue dans les cours. Aperçu en direct sur un motif coloré.
- **Valeurs** : 0 = ultra-clair, 50 = équilibré (défaut), 100 = teinté
  (opaque). Enregistré sur l'appareil (`localStorage` `papote_glass`) et
  appliqué immédiatement à toutes les pages ouvertes (iframes de cours et
  autres onglets compris).
- **API** :
  ```js
  PapoteGlass.get()        // 0…100
  PapoteGlass.set(30)      // change, enregistre, propage
  ```
- **Effet** : `--lg-t` (0…1) pilote l'opacité de la teinte des surfaces
  flottantes (`--lg-alpha`), celle des cartes (`--lg-alpha-lite`, de 0,52 à 1
  en clair, de 0,66 à 1 en sombre), les anciens jetons `--ig27-glass-regular-bg`
  (accueil, connexion, administration) et la force du flou (`--lg-blur`, plus
  fort quand le verre est clair pour diffuser les fonds chargés).
  `html[data-glass]` vaut `clear`, `regular`, `tinted` ou `solid`. La valeur
  choisie s'affiche sous le curseur (« 30 % — Équilibré »).
- **Fond d'ambiance** : le verre n'a d'intérêt que s'il y a de la couleur
  derrière. Les pages ont donc un « fond d'écran » discret (dégradés de la
  couleur de la marque, du bleu, du rose et de l'orange) posé sur un calque
  fixe `body::before`, et non via `background-attachment: fixed`, que Safari
  iOS et Android ignorent (le fond disparaissait au défilement). Il est retiré
  en contraste élevé et en couleurs forcées.

## 4. Lisibilité d'abord

- **Plancher d'opacité** : `--lg-min` 0,52 en clair, 0,70 en sombre (surfaces
  flottantes) ; 0,52 / 0,66 pour les cartes.
- **Texte secondaire renforcé** sur le verre clair (gris plus foncé en mode
  clair, plus clair en mode sombre).
- **Mesure du pire cas** (verre posé sur du noir, du blanc et un fond très
  coloré, 3 réglages × clair / sombre × 2 recettes) : texte principal ≥ 5,2:1,
  texte secondaire ≥ 4,5:1 — niveau AA du WCAG partout.
- **Barre uniforme (iOS 27)** : quand on fait défiler du contenu sous une barre
  flottante, elle devient plus opaque (`html.lg-scrolled`) pour garder son
  texte lisible.

## 5. Accessibilité et préférences

| Préférence | Effet |
|---|---|
| Réduire la transparence (`prefers-reduced-transparency`) | verre opaque, pas de flou ni de réfraction |
| Augmenter le contraste (`prefers-contrast: more`) | verre opaque, liseré net, pas de franges colorées |
| Réduire les animations (`prefers-reduced-motion`) | pas de morphing, d'ondulation ni de goutte animée |
| Couleurs forcées (Windows) | surfaces système `Canvas` / `CanvasText` |
| Mode sombre / clair | jetons dédiés (teinte, liseré, ombres) |
| Navigateur sans `backdrop-filter` | teinte plus dense (≥ 0,86) |

Le profil signale quand une préférence système impose un verre opaque.

## 6. Performance

- Le flou n'est appliqué qu'aux surfaces flottantes ; les listes (centaines de
  lignes de vocabulaire) utilisent la recette légère.
- Réfraction réservée à Chromium, désactivée sur appareils à moins de 4 Go de
  mémoire.
- **Qualité adaptative** : pendant les premiers défilements, `liquid-glass.js`
  mesure la fluidité ; si la médiane dépasse 22 ms par image (< ~45 img/s),
  toute l'application passe en verre « léger » (`data-lg-quality="low"` :
  même teinte, liseré et reflets, mais opaque et sans flou), comme iOS sur du
  matériel modeste. Gardé pour la session.

Mesures (défilement continu, Chromium headless **sans GPU**, donc pessimiste) :

| Profil | Accueil public | Accueil d'une langue | Vocabulaire |
|---|---|---|---|
| Mobile 393×852, CPU ralenti ×4 — Liquid Glass | 60 img/s | 60 img/s | 59 img/s |
| Mobile, verre opaque (référence) | 60 | 60 | 60 |
| Ordinateur 1440×900 — Liquid Glass | 52 | 60 (qualité adaptée) | 60 (qualité adaptée) |
| Ordinateur, verre opaque (référence) | 60 | 58 | 60 |

Sur un vrai ordinateur, la composition se fait sur la carte graphique et le
mode léger ne se déclenche normalement pas.

## 7. Compatibilité

| Moteur | Rendu |
|---|---|
| Chromium (Chrome, Edge, Opera, Samsung, WebView Android) | complet, avec réfraction |
| WebKit (Safari macOS/iOS/iPadOS, WebView iOS) | complet sauf réfraction (flou + franges + reflets) |
| Firefox | complet sauf réfraction |
| Navigateurs anciens sans `backdrop-filter` | teinte dense, liseré et reflets |

La suite `npm run test:responsive` (Chromium, Firefox, WebKit en CI) vérifie
sur 9 appareils que le verre est actif, que le curseur s'applique, que la
fenêtre de connexion tient à l'écran et que la page Premium est complète.

## 8. Personnaliser

Jetons dans `liquid-glass.css` (`:root` et `html[data-theme="dark"]`) :
`--lg-tint` (couleur de la teinte), `--lg-min` (plancher de lisibilité),
`--lg-blur`, `--lg-sat`, `--lg-rim-hi` / `--lg-rim-lo` (bord de Fresnel),
`--lg-lisere` (liseré du haut), `--lg-edge` (bord assombri), `--lg-sheen`
(reflet), `--lg-fringe-r` / `--lg-fringe-b` (aberration chromatique),
`--lg-shadow`, `--lg-spring` (ressort des animations). La lentille de
réfraction se règle dans `liquid-glass.js` (`baseFrequency`, `scale`).
