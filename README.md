# Mes langues — app d'apprentissage (39 langues)

Application web d'apprentissage de 39 langues (anglais, espagnol, italien,
hébreu, chinois, portugais, russe, allemand, japonais, français, hindi, coréen,
arabe, turc, néerlandais, grec, polonais, suédois, vietnamien, latin, norvégien,
irlandais, indonésien, haut valyrien, ukrainien, finnois, danois, roumain,
tchèque, zoulou, hawaïen, swahili, gallois, hongrois, gaélique écossais, créole
haïtien, espéranto, klingon, navajo), toutes avec les mêmes modules, du niveau
A1 au C2. Inscription par email + mot de passe (comptes sur PostgreSQL, mots de
passe hachés bcrypt), compte administrateur, abonnement Premium (Stripe) et
facture envoyée par email.

## Design

L'app entière suit le langage visuel **iOS 27 « Liquid Glass »**, de façon
uniforme : les 6 pages d'habillage (connexion, profil, idées, admin,
réinitialisation, abonnement), la chrome d'`app.html` (accueil, barre du haut,
barre d'onglets, écran de chargement) et les 936 pages de contenu embarquées
(24 modules × 39 langues) — toutes rendues par le même moteur de cours
(`course/engine.js` + `course/engine.css`), donc exactement le même design que
l'hébreu, sans exception.

- **Source de vérité unique** : `design-system/ios27-liquid-glass.css` (tokens
  `--ig27-*` : couleurs système clair/sombre, échelle typographique SF Pro,
  rayons, verre — flou + saturation —, élévations, animations). Aucune page ne
  code de valeur en dur ; un besoin nouveau = un token ajouté dans ce fichier.
- **Couche applicative** : `design-system/ios27-app.css`, chargée par toutes
  les pages après leur propre style : pont des anciens noms de variables
  (`--ink`, `--bg`, `--primary`...) vers les tokens, verre sur les barres,
  boutons flottants, toasts et overlays (jamais sur le contenu), boutons
  d'action en pilule, retour tactile, apparition en douceur, et respect de
  `prefers-reduced-motion` / `prefers-reduced-transparency` partout.
- **Une seule couleur d'accent** : le bleu système (`#0088ff` clair / `#0091ff`
  sombre). Chaque langue garde seulement une teinte d'identité sur sa carte
  d'accueil, choisie parmi les couleurs système.
- **Thème** : `data-theme="light"|"dark"` toujours explicite (préférence du
  système par défaut, bouton 🌙/☀️ pour forcer), partagé entre toutes les pages.
- Les deux fichiers sont servis par `server.js` sous `/design-system/`.

`scripts/liquid-glass.js` fournit le script d'initialisation du thème injecté
dans chaque page générée par `scripts/course/build.js`.

## Modèle d'accès

Toutes les langues sont accessibles gratuitement à tout le monde, au niveau de
base (vocabulaire, grammaire, exercices, lecture). L'abonnement Premium
débloque du feedback plus poussé, des leçons et des exercices avancés —
**langue par langue et module par module** : `/admin` expose une grille de
39 langues × 3 modules (Feedback avancé / Leçons avancées / Exercices avancés),
soit 117 interrupteurs indépendants, avec un filtre/recherche par langue et des
actions groupées (tout premium / tout gratuit, par langue entière, par module
sur toutes les langues à la fois). Chaque compte peut aussi réorganiser
librement l'ordre des cartes de langues sur l'accueil (bouton « ↕️
Réorganiser », glisser-déposer, ordre sauvegardé par compte).

Indépendamment de ça, chaque langue a aussi un **statut** (`active` ou
`development`), modifiable à tout moment depuis `/admin` (menu « Statut » sur
chaque ligne). Une langue en développement est grisée et non cliquable sur
l'accueil (badge « 🚧 Bientôt »), pratique pendant qu'une langue est encore en
cours de rédaction — ce changement n'envoie jamais d'email.

## Mon profil / langue de base

Chaque compte a une page `/profile` pour choisir son prénom et sa **langue de
base** (celle qu'on parle déjà). Tout le site s'y adapte :

- **Traductions des mots et des phrases** : disponibles dans les 39 langues de
  base (chaque concept du vocabulaire est traduit dans toutes les langues).
  Quand une traduction manque (anciens mots propres à une langue), une autre
  langue est affichée avec une étiquette (ex. `FR`).
- **Interface** (menus, boutons, exercices, statistiques, profil, idées) :
  entièrement traduite en français, anglais, espagnol, italien, portugais,
  allemand, néerlandais, russe, arabe, hébreu, chinois, japonais, coréen, turc
  et polonais (`course/i18n.js` + `course/i18n/<code>.js`). Les autres langues
  de base ont l'interface en anglais. Arabe et hébreu passent en droite-à-gauche.
- **Explications** de grammaire et de culture : rédigées en français et en
  anglais ; les autres langues de base reçoivent la version anglaise.

## Boîte à idées

Chaque compte peut soumettre une suggestion depuis `/ideas` (lien « 💡 Idées »
sur l'accueil). Les suggestions sont regroupées et envoyées en une seule fois
par email (à `DIGEST_EMAIL`, ou à `ADMIN_EMAIL` par défaut) une fois par jour,
en fin de journée (heure de Paris, configurable via `DIGEST_HOUR_LOCAL`,
22h par défaut). Deux mécanismes d'envoi coexistent pour rester fiables même
si le service se met en veille (plan gratuit Render) :
- un vérificateur interne toutes les 15 minutes (tant que le service tourne) ;
- `POST /api/internal/send-digest` (protégé par l'en-tête `X-Digest-Secret`,
  à faire correspondre à la variable `DIGEST_CRON_SECRET`), pensé pour être
  appelé une fois par jour par un Render Cron Job externe.
Chaque suggestion n'est envoyée qu'une seule fois (marquée `sent_at` en base).

Chaque idée a une **catégorie** (fonctionnalité, contenu, nouvelle langue,
design, bug, autre). Dans `/admin`, la section « 💡 Idées » liste toutes les
idées (auteur, date, catégorie, contenu), avec recherche et filtres, un
**statut** modifiable (nouvelle, vue, en cours, acceptée, refusée) et des
**notes internes** visibles uniquement par l'administrateur.

## Développement local

```
npm install
export JWT_SECRET=change-me
export DATABASE_URL=postgresql://user:pass@localhost:5432/langues_app
export ADMIN_EMAIL=ton-email@exemple.com
npm start
```

## Déploiement (Render)

Le `render.yaml` (Blueprint) provisionne un service web Node + une base
PostgreSQL gratuite, avec `JWT_SECRET`/`DATABASE_URL` déjà câblés.

## Compte administrateur

Le compte dont l'email correspond à la variable `ADMIN_EMAIL` (à définir dans
Render → Environment ; aucune valeur par défaut) devient administrateur dès
qu'il a confirmé son adresse : lien de l'email de bienvenue, ou « Mot de passe
oublié ? » puis le lien reçu. Un compte déjà administrateur le reste. Un lien "⚙️ Admin" apparaît alors sur l'accueil,
menant vers `/admin` : la grille des 117 interrupteurs premium/gratuit décrite
ci-dessus, plus les statistiques (comptes, abonnés, revenu encaissé). Décoché =
gratuit pour tout le monde. Un compte admin a toujours accès à tout, y compris
le contenu payant.

## Sécurité

Le rapport d'audit complet (problèmes, gravité, corrections, reste à faire) est
dans [`SECURITY.md`](SECURITY.md). En bref :

- **Admin** : le rôle n'est donné au compte `ADMIN_EMAIL` qu'après une preuve
  de possession de l'adresse (lien de confirmation de l'email de bienvenue, ou
  lien de réinitialisation du mot de passe). Toutes les actions admin sont
  journalisées (`/admin` → « 🧾 Journal »).
- **Sessions** : cookie `httpOnly` / `SameSite=Lax` / `Secure` en production,
  JWT HS256 révocable (réinitialisation du mot de passe, « Déconnecter tous les
  appareils », suppression du compte). Mots de passe bcrypt, 8 caractères
  minimum pour les nouveaux.
- **Requêtes** : SQL paramétré, contrôle `Origin` / `Sec-Fetch-Site` contre le
  CSRF, erreurs toujours en JSON sans détail interne, `Cache-Control: no-store`
  sur l'API, limitation de débit sur les routes sensibles.
- **Premium** : appliqué côté serveur ; il suit l'état réel de l'abonnement
  Stripe. Configurer le webhook Stripe avec les événements
  `checkout.session.completed`, `customer.subscription.updated` et
  `customer.subscription.deleted`.
- **RGPD** : export des données (JSON) et suppression du compte depuis
  `/profile` → « Mes données ».
- **Tests** : `TEST_DATABASE_URL=postgresql://… npm test` lance 21 tests
  d'attaque contre le vrai serveur (base de test effacée à chaque lancement).

## Emails transactionnels (Resend)

Deux emails automatiques côté compte, envoyés par `lib/email.js` via l'API
Resend :
- **bienvenue** — juste après la création du compte (`POST /api/signup`) ;
- **réinitialisation du mot de passe** — sur `POST /api/forgot-password`,
  uniquement si le compte existe (réponse identique sinon).

(La facture après paiement et le récapitulatif quotidien de la boîte à idées
passent par le même helper.)

Deux variables d'environnement, à créer dans **Render → ton service →
Settings → Environment** (jamais dans le code ni dans un commit — voir aussi
`.env.example`) :

| Variable | Où l'obtenir |
|---|---|
| `RESEND_API_KEY` | resend.com → dashboard → **API Keys** → *Create API Key* (accès « Sending » suffit). |
| `EMAIL_FROM` | L'expéditeur, ex. `Mes langues <no-reply@ton-domaine.com>`. Le domaine doit d'abord être **vérifié** dans Resend → **Domains** → *Add domain*, puis ajouter chez ton hébergeur DNS les enregistrements affichés (SPF + DKIM, DMARC conseillé) et attendre le statut *Verified*. |

Comportement :
- Sans `RESEND_API_KEY`, l'app fonctionne normalement : aucun email n'est
  envoyé, un avertissement est loggé au démarrage et à chaque envoi sauté
  (`[email] RESEND_API_KEY not set - skipping ...`). Jamais de crash.
- Sans `EMAIL_FROM`, l'expéditeur de test de Resend (`onboarding@resend.dev`)
  est utilisé : il ne délivre qu'à l'adresse du propriétaire du compte Resend.
  Un avertissement le rappelle au démarrage.
- Un envoi échoué (réseau, 429, 5xx) est retenté une fois ; une erreur de
  configuration (clé invalide, domaine non vérifié) est loggée avec la réponse
  de Resend. Un email qui échoue ne fait jamais échouer l'inscription ni la
  demande de réinitialisation.

## Mot de passe oublié

Un lien « Mot de passe oublié ? » sur la page de connexion envoie un email
(même template Resend) avec un lien de réinitialisation valable 1 heure
(`POST /api/forgot-password`, puis `/reset-password?token=...` →
`POST /api/reset-password`). Le token est stocké haché (SHA-256) en base,
à usage unique, et la réponse de `/api/forgot-password` est volontairement
identique que l'email existe ou non (pas d'énumération de comptes).
`APP_URL` (par défaut `https://langues-app.onrender.com`) sert à construire
le lien dans l'email — à ajuster si le domaine change.

## Paiement par abonnement (Stripe) + factures

`POST /api/checkout` crée une session Stripe Checkout (abonnement récurrent) ;
`POST /api/webhooks/stripe` reçoit la confirmation de paiement, passe le compte
en premium et envoie la facture par email. À configurer sur Render :
- `STRIPE_SECRET_KEY` — clé secrète de ton compte Stripe (Dashboard → Developers → API keys).
- `STRIPE_PRICE_ID` — l'ID du tarif récurrent créé dans Stripe (Produits → créer
  un produit avec un prix récurrent mensuel/annuel).
- `STRIPE_WEBHOOK_SECRET` — à créer dans Stripe (Developers → Webhooks → Add
  endpoint), URL : `https://<ton-app>.onrender.com/api/webhooks/stripe`,
  événement à écouter : `checkout.session.completed`.

**Virements sur ton compte** : Stripe reverse automatiquement l'argent encaissé
vers le compte bancaire renseigné dans ton Dashboard Stripe (Paramètres →
Comptes bancaires / Payouts). Cette app ne touche jamais à tes coordonnées
bancaires — c'est à faire une seule fois, directement dans Stripe.

## Moteur de cours et contenu

Chaque langue × module est une petite page (`<body data-lang data-page>`)
générée dans `ALL_PAGES` d'`app.html`, qui charge le moteur commun
`course/engine.js`. Les données viennent de `GET /api/course/:lang` (le serveur
retire lui-même le contenu Premium pour les comptes gratuits) et la
progression est synchronisée sur `/api/progress/:lang`.

Modules (identiques pour toutes les langues) : accueil, vocabulaire, phrases,
grammaire, conjugaison, alphabet (écritures non latines), lecture, écoute,
exercices (QCM, traduction inverse, écoute, écriture, dictée, texte à trous,
remise en ordre, conjugaison, mix), révision (répétition espacée), prononciation
(reconnaissance vocale), culture, examens par niveau, statistiques, badges,
certificats, dictionnaire, profil, et une page par niveau A1 → C2.
**Audio partout** : chaque mot, phrase, exemple, forme verbale, lettre et texte
a son bouton 🔊 (synthèse vocale du navigateur ; voix approchée signalée pour
les langues sans voix native).

Contenu source (`content/`) :
- `vocab/*.txt`, `phrases/*.txt` : matrices multilingues, un concept par ligne
  avec son **niveau CECRL** et sa traduction dans chaque langue ;
- `langs/<code>.js` : grammaire, conjugaison, lectures avec questions, culture,
  alphabet propres à chaque langue (explications en français et en anglais) ;
- `legacy/<code>.json` : contenu historique converti sans perte ;
- `meta.js` : nom, drapeau, voix de synthèse, sens d'écriture.

`node scripts/course/build.js` régénère `course/data/<code>.json` et les pages
de `app.html` (`--check` pour valider sans écrire). Le contenu a été rédigé
sans relecture par des locuteurs natifs : à faire relire avant un usage
sérieux, surtout pour les langues rares ou construites (haut valyrien, klingon,
navajo, hawaïen, zoulou, gaélique écossais), volontairement limitées à des
formes vérifiées.

## Niveaux CECRL

Chaque mot a un niveau A1–C2, affiché partout (vocabulaire, leçons, exercices,
révisions, dictionnaire) avec filtres et tri par niveau. Au démarrage, le
serveur synchronise tout le vocabulaire dans la table `course_words`
(`lang, word_id, word, level, level_override…`). La section « 🎯 Niveaux des mots » de
`/admin` permet de rechercher un mot et de corriger son niveau
(`level_override`), appliqué immédiatement dans l'app.

## Premium

Gratuit : tout le contenu A1 → B2 de toutes les langues, 3 leçons par jour,
révision par boîtes (20 par jour), exercices de base. Premium (réglable par
fonctionnalité dans `/admin`, section « ★ Fonctionnalités premium ») :
niveaux C1/C2, leçons illimitées, révision SM-2 avancée sans limite,
prononciation avec reconnaissance vocale et score, statistiques avancées,
progression détaillée mot par mot, certificats, badges, mode hors-ligne,
mots personnels illimités, examens blancs, export CSV, plus les réglages
langue × module (feedback avancé, leçons avancées, exercices avancés). L'app
n'affiche aucune publicité. Les restrictions sont appliquées côté serveur
(contenu C1/C2 retiré de la réponse API pour les comptes gratuits).
