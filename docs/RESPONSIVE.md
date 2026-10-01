# Papote — système adaptatif (responsive)

Ce document décrit comment Papote s'adapte à tous les appareils, du téléphone
plié de 280 px à la télévision 4K, et comment le vérifier.

Aperçus (générés par la suite de tests) :
[téléphones](responsive/phones.jpg) ·
[paysage, tablettes, pliables](responsive/tablets-landscape.jpg) ·
[ordinateurs, grands écrans, TV](responsive/desktop-tv.jpg)

## 1. Les trois briques

| Fichier | Rôle |
|---|---|
| `design-system/device.js` | Détecte l'appareil et l'expose à toute l'app (attributs sur `<html>`, variables CSS, API JS). Chargé en premier sur chaque page et dans chaque page de cours. |
| `design-system/responsive.css` | Socle commun chargé **en dernier** partout : tailles fluides, zones sûres, cibles tactiles, préférences utilisateur, tableaux, pliables. |
| `course/engine.css` (fin du fichier) + `course/engine.js` | Couche adaptative des modules de cours : menu burger / barre latérale, quiz plein écran sans défilement, barre de progression. |

Tout fonctionne aussi sans JavaScript : chaque règle basée sur un attribut a un
équivalent en media query (`pointer: coarse`, `orientation`, `max-height`…).

## 2. Points de rupture (mobile-first)

| Nom | Largeur de la fenêtre | Usage typique |
|---|---|---|
| `xs` | < 360 px | petits téléphones, Galaxy Fold plié |
| `sm` | ≥ 360 px | téléphones |
| `md` | ≥ 600 px | grands téléphones en paysage, petites tablettes |
| `lg` | ≥ 900 px | tablettes, pliables ouverts |
| `xl` | ≥ 1200 px | ordinateurs portables → **barre latérale** dans les cours |
| `xxl` | ≥ 1600 px | grands écrans |
| `tv` | ≥ 2400 px ou téléviseur détecté | TV, écrans 4K |

Les largeurs ne sont jamais utilisées seules : on les combine avec la hauteur
(`data-short` sous 500 px, `max-height: 540px` en paysage), l'orientation, le
type d'entrée (tactile/souris) et le type d'appareil. À l'intérieur des cartes,
on préfère les **container queries** (`@container`) : un composant s'adapte à la
place qu'il a, pas à la taille de l'écran (barre de progression, réponses du quiz).

## 3. Détection (`window.PapoteDevice`)

```js
PapoteDevice.info        // instantané (voir ci-dessous)
PapoteDevice.on(fn)      // fn(info) tout de suite puis à chaque changement
PapoteDevice.refresh()   // re-détecter (appelé seul sur resize/rotation)
window.addEventListener("papote:device", e => e.detail)
```

`info` contient : `type` (phone, tablet, laptop, desktop, wide, tv), `bp`, `os`
(ios, ipados, android, windows, macos, linux, chromeos), `browser` (+ version),
`brand` et `model` (quand le navigateur les donne ; Chromium les fournit via
`userAgentData`), `webview`, `input` (touch, mouse, hybrid), `pen` (stylet vu),
`keyboardNav`, `viewport` (dont la hauteur visible qui rétrécit avec le clavier
virtuel), `screen`, `dpr`, `ratio`, `orientation`, `short`, `tiny`,
`foldSegments`, `zoom` (navigateur ≈, pincement, échelle UI) et `prefs`
(sombre, contraste, réduction des animations / de la transparence, couleurs
forcées, taille de texte système).

Attributs posés sur `<html>` : `data-device`, `data-bp`, `data-os`,
`data-browser`, `data-input`, `data-orient`, `data-short`, `data-tiny`,
`data-fold`, `data-webview`, `data-pen`, `data-kbd`, `data-bigtext`.
Variables CSS : `--vh`, `--app-h` (hauteur visible), `--app-hz` (même chose en
px CSS zoomés), `--ui-zoom`.

**Grands écrans et TV** : au-delà de 2000 px de large (ou sur un téléviseur),
l'interface entière est agrandie avec `zoom` (×1,6 à 2560 px, ×2,4 en 4K, jusqu'à
×3 pour une TV) pour rester lisible à distance.

### Mode debug

Ajouter `?debug=device` à n'importe quelle URL (mémorisé) ou appuyer sur
**Alt + Maj + D** : un panneau affiche l'appareil détecté, le système, le
navigateur, l'entrée, les dimensions, le DPI, le zoom, les drapeaux, les
préférences et le point de rupture actif. `?debug=off` le désactive.

## 4. Socle CSS (`responsive.css`)

- **Tailles fluides** : titres en `clamp()` (plus petits sur téléphone), marges
  `--pp-gutter` / `--pp-gap` proportionnelles à l'écran.
- **Zones sûres** (encoche, Dynamic Island, barre d'accueil) : `viewport-fit=cover`
  sur toutes les pages + `env(safe-area-inset-*)`.
- **Cibles tactiles** : 44 × 44 px minimum sur écran tactile (boutons, liens de
  pied de page, retours, résumés dépliables, curseurs, boutons audio).
- **Préférences** : réduction des animations, de la transparence, contraste
  élevé (bordures plus visibles, textes plus foncés), couleurs forcées
  (Windows), taille de texte système (Dynamic Type iOS, échelle Android).
- **Débordement horizontal** impossible au niveau de la page ; les mots longs
  passent à la ligne.
- **Tableaux** : `.table-scroll` (défilement horizontal contenu dans la carte)
  et `.cards-sm` (une carte par ligne sous 720 px, chaque cellule étiquetée).
- **Pliables** : `horizontal-viewport-segments` — rien sous la charnière.

## 5. Quiz : tout tient à l'écran

Quand un écran de quiz / leçon / test de niveau / leçon du jour s'affiche
(présence de `.duo-bar`), la page de cours passe en **mode quiz** :

1. elle prévient l'application (`postMessage({immersive:true})`) qui masque sa
   barre du haut et la barre d'onglets et donne à l'iframe toute la hauteur
   visible (zones sûres et clavier virtuel compris) ;
2. la mise en page devient une colonne pleine hauteur : barre (fermer,
   progression, cœurs/XP) puis la carte centrée ;
3. `fitQuiz()` ajuste l'échelle `--qz` (1 → 0,6) des textes, espacements et
   boutons jusqu'à ce que **la question, les réponses, le retour et
   « Continuer »** tiennent sans défilement ; si ce n'est pas suffisant, une
   étape compacte retire le secondaire (intitulé, réponses non choisies après
   coup, notes) ; en tout dernier recours (écran minuscule), seule la zone du
   quiz défile, jamais la page.

Adaptations :
- **téléphone** : réponses empilées, 44 px minimum, clavier de caractères
  spéciaux défilant horizontalement sur écran bas ;
- **paysage** (téléphone couché) : question à gauche, réponses à droite ;
  cartes de leçon : mot à gauche, sens et exemple à droite ;
- **tablette / ordinateur** : réponses sur 2 colonnes, 4 colonnes sur très
  grand écran quand elles sont courtes ; touches **1-4** pour répondre, **Entrée**
  pour continuer, **Échap** pour quitter ;
- **pliable ouvert** : une moitié pour la question, l'autre pour les réponses.

## 6. Barre de progression

Composant `progressBar(étape, total, %)` (quiz, leçons, leçon du jour, test de
niveau, examens) : `role="progressbar"` avec texte accessible
(« Question 3 sur 10 (30 %) »), libellé visible `3/10 · 30 %`, animation fluide
depuis la valeur précédente.
- **Téléphone** (barre < 560 px, container query) : fine ligne pleine largeur
  le long du bas de l'en-tête, libellé centré ; le pourcentage disparaît sous 300 px.
- **Ordinateur** : piste plus épaisse intégrée à l'en-tête, libellé à droite.

Les jauges de niveau (accueil, pages de niveau) gardent leur largeur fluide.

## 7. Navigation et pages

- **Modules de cours** : menu burger (☰ / ✕, Échap pour fermer, focus sur
  l'élément actif) sous 1200 px, en grille 2 colonnes sur téléphone ;
  **barre latérale permanente** à partir de 1200 px (la barre d'onglets de
  l'application est alors masquée car redondante).
- **En-tête** : sur téléphone, boutons icône seule (texte gardé pour les
  lecteurs d'écran), titres tronqués proprement.
- **Vocabulaire** : bouton audio toujours à côté du mot ; filtres qui passent
  à la ligne ; niveaux CECRL toujours visibles.
- **Admin** : menu des sections en bandeau défilant sur mobile, tableaux en
  cartes, lignes de langues qui passent à la ligne.
- **Images** : mascotte et logo servis en `<picture>` AVIF / WebP (2 tailles,
  `srcset` + `sizes`) avec PNG de secours — 1,6 Mo → 0,16 Mo pour les 16
  mascottes ; chargement différé hors écran principal.

## 8. Tests

```bash
# suite responsive (navigateurs réels, base jetable)
TEST_DATABASE_URL=postgresql://…/langues_test BROWSERS=chromium,firefox,webkit npm run test:responsive
```

`test/responsive/responsive.e2e.js` démarre le serveur et vérifie, sur 9 profils
(Galaxy Fold plié 280×653, iPhone SE 320×568, iPhone 15, téléphone en paysage
852×393 et 568×320, iPad, portable 1366×768, 1920×1080, TV 4K) :
- aucun débordement horizontal (accueil public, profil, abonnement, idées,
  accueil connecté, modules de cours) ;
- cibles tactiles ≥ 44 px sur écrans tactiles ;
- détection correcte du type d'appareil, de l'entrée et de l'orientation,
  panneau de debug présent ;
- quiz entièrement visible sans défilement avant **et** après la réponse,
  barre de progression accessible, retour à la mise en page normale en quittant.

La CI GitHub l'exécute sur **Chromium (Chrome, Edge, WebView Android)**,
**Firefox** et **WebKit (Safari, WebView iOS)**. Les tests sur appareils réels
(iPhone, Android, iPad, TV) restent recommandés avant une grande mise en
production : utiliser `?debug=device` pour vérifier la détection sur place.
