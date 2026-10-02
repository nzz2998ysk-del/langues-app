# Papote — app d'apprentissage des langues (39 langues)

Application web d'apprentissage de 39 langues (anglais, espagnol, italien,
hébreu, chinois, portugais, russe, allemand, japonais, français, hindi, coréen,
arabe, turc, néerlandais, grec, polonais, suédois, vietnamien, latin, norvégien,
irlandais, indonésien, haut valyrien, ukrainien, finnois, danois, roumain,
tchèque, zoulou, hawaïen, swahili, gallois, hongrois, gaélique écossais, créole
haïtien, espéranto, klingon, navajo), toutes avec les mêmes modules, du niveau
A1 au C2. Inscription par email + mot de passe (comptes sur PostgreSQL, mots de
passe hachés bcrypt), compte administrateur, abonnement Premium (Stripe) et
facture envoyée par email.

## Accueil, logo et mascotte

- **Page d'accueil publique** (`login.html`, servie sur `/` sans session) :
  hero avec le logo animé et des bulles « bonjour » dans plusieurs langues,
  chiffres clés, défilé des 39 langues, fonctionnalités, étapes, Premium,
  liens légaux ; connexion, inscription, mot de passe oublié et double
  authentification dans une feuille modale.
- **Animation d'ouverture** de l'application (logo ou bulle + lettres
  « Papote », « bonjour » dans 12 langues), une fois par session, respecte
  « réduire les animations ».
- **Logo et mascotte** : fichiers à déposer dans `design-system/brand/` (voir
  le README de ce dossier), puis `python3 scripts/brand/process-brand.py`. Tant
  qu'ils sont absents, l'app affiche un logotype dessiné en CSS et les emoji
  habituels. La mascotte réagit aux bonnes et mauvaises réponses, aux fins de
  leçon, examens, révisions, badges, objectif du jour, contenu Premium…

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

## Audio des cours

Chaque mot et chaque phrase de 24 langues a un fichier MP3 pré-généré avec
des voix neuronales libres (Piper, via sherpa-onnx) : `course/audio/<langue>/`
(~54 Mo au total, mis en cache un an par le navigateur). Pour régénérer après
un changement de contenu (seuls les textes nouveaux sont synthétisés) :

    pip install sherpa-onnx numpy lameenc
    PIPER_VOICES=/chemin/vers/voix python3 scripts/audio/generate.py [langue ...]
    node scripts/course/build.js

Le japonais, le coréen, l'hébreu, le grec, l'ukrainien et les langues rares
utilisent la voix de l'appareil (pas de voix libre de qualité suffisante).
Chacun peut aussi choisir « Voix de l'appareil » dans le profil d'une langue.

## Amis, défis et parrainage

Chaque compte a un code ami (8 caractères) et un lien d'invitation
`/?ref=CODE`. Le module « Amis & défis » affiche le classement de la semaine
(XP gagnés depuis lundi, toutes langues ; seuls les prénoms affichés sont
visibles, jamais les emails). Quand une personne invitée s'abonne (webhook
Stripe), la personne qui l'a invitée reçoit `REFERRAL_DAYS` jours de Premium
(30 par défaut), une seule fois par filleul. Les tenues de Papote (écharpe,
nœud, fleur, casquette, toque, couronne) se débloquent avec les XP de chaque
langue ; des tenues dessinées en HD demanderont des illustrations dédiées.

## Mode enfant / mode adulte

Chaque compte a un mode (`users.mode` : `adult` par défaut, ou `kids`), renvoyé par `/api/me` et `/api/course/:lang`, modifiable via `PUT /api/profile {mode}` (bouton « Mode enfant » de l'accueil, ou champ « Mode » du profil).

- **Mode enfant** : interface simplifiée, très visuelle (gros boutons, emojis, mascotte) — histoires illustrées bilingues avec mots à toucher pour les entendre, jeux (« Écoute et trouve », « Quel est le mot ? », Memory, thèmes), imagier par catégorie, étoiles et album d'autocollants. Le contenu est dans `course/kids.js` (mots, histoires, autocollants) et réutilise le vocabulaire de chaque langue.
- **Retour au mode adulte** protégé par une petite multiplication (« espace des parents »), pour qu'un enfant ne puisse pas en sortir seul.

## Liquid Glass (iOS 27)

Toutes les surfaces flottantes (barres, onglets, fenêtres, menus,
notifications) et les cartes utilisent le matériau Liquid Glass
(`design-system/liquid-glass.css` + `liquid-glass.js`), avec un curseur de
transparence dans le profil, l'adaptation clair/sombre et aux préférences
d'accessibilité, et une qualité adaptative pour les appareils modestes.
Détails, mesures et personnalisation : [docs/LIQUID-GLASS.md](docs/LIQUID-GLASS.md).

## Adaptation à tous les écrans

Téléphones (dès 280 px, encoches, paysage), tablettes, pliables, ordinateurs,
grands écrans et TV : détection d'appareil (`design-system/device.js`, mode
debug `?debug=device`), socle `design-system/responsive.css`, quiz plein écran
sans défilement. Tout est décrit dans [docs/RESPONSIVE.md](docs/RESPONSIVE.md) ;
tests : `npm run test:responsive` (Chromium, Firefox, WebKit en CI).

## Rappels quotidiens

Depuis son profil, chaque compte peut activer un rappel par email (heure au
choix, fuseau horaire du navigateur). Il ne part que les jours où la personne
n'a pas encore pratiqué, au plus une fois par jour, et seulement vers une
adresse vérifiée. Chaque email contient un lien de désinscription signé
(et les en-têtes `List-Unsubscribe` pour la désinscription en un clic).
Envoi : vérificateur interne toutes les 10 minutes, plus
`POST /api/internal/send-reminders` (même en-tête `X-Digest-Secret` /
`DIGEST_CRON_SECRET`) à appeler **toutes les heures** par un Render Cron Job,
car le plan gratuit met le service en veille.

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
- **CSP stricte** : aucun script inline autorisé sans nonce, aucun gestionnaire
  `onclick=` ; violations remontées sur `/api/csp-report`.
- **Double authentification obligatoire pour l'admin** (TOTP : Apple Mots de
  passe, Google Authenticator, 1Password…, avec 8 codes de secours) ; secret
  chiffré en base (AES-256-GCM).
- **Configuration vérifiée** : `/admin` → « 🔐 Sécurité & configuration » liste
  ce qui est en place ou manquant (ADMIN_EMAIL, SendGrid, Stripe et ses
  événements de webhook — ajoutés automatiquement via l'API Stripe —, TLS de
  la base, dernière sauvegarde, mentions légales).
- **Sauvegardes** : `.github/workflows/db-backup.yml` fait chaque nuit un
  `pg_dump` chiffré (AES-256), conservé 30 jours. Secrets GitHub à créer :
  `BACKUP_DATABASE_URL` (Render → base → *External Database URL*) et
  `BACKUP_PASSPHRASE`. Restauration : `scripts/restore-db.sh`.
- **TLS base de données** : `DATABASE_SSL=auto` (défaut) essaie d'abord une
  connexion avec certificat vérifié et ne se replie sur un TLS non vérifié
  qu'en dernier recours (signalé dans l'admin) ; `DATABASE_SSL_CA` pour fournir
  le certificat.
- **Mentions légales et confidentialité** : `/mentions-legales` et
  `/confidentialite`, identité de l'éditeur via `LEGAL_PUBLISHER`,
  `LEGAL_ADDRESS`, `LEGAL_CONTACT_EMAIL` (et `LEGAL_SIRET`, `LEGAL_DIRECTOR`
  facultatifs).
- **Tests** : `TEST_DATABASE_URL=postgresql://… npm test` lance 23 tests
  d'attaque contre le vrai serveur (base de test effacée à chaque lancement).

## Emails transactionnels (SendGrid)

Deux emails automatiques côté compte, envoyés par `lib/email.js` via l'API
SendGrid :
- **bienvenue** — juste après la création du compte (`POST /api/signup`) ;
- **réinitialisation du mot de passe** — sur `POST /api/forgot-password`,
  uniquement si le compte existe (réponse identique sinon).

(La facture après paiement et le récapitulatif quotidien de la boîte à idées
passent par le même helper.) Tous les emails (bienvenue, mot de passe oublié,
facture, rappel quotidien, boîte à idées) partagent le même gabarit au design
de Papote (`layout()` dans `lib/email.js` : logo, mascotte, carte blanche
arrondie, dégradé bleu → indigo, version texte incluse) ; logo et mascotte
sont chargés depuis `APP_URL`.

**Tester les emails** : page Admin → « Sécurité & configuration » → *Envoyer
les emails de test*. Un exemplaire de chaque email (bienvenue, mot de passe
oublié, facture Premium avec son PDF, rappel quotidien, boîte à idées) part à
l'adresse de l'admin connecté, sujet préfixé par `[TEST]`. Rien n'est créé
(ni compte, ni paiement, ni numéro de facture) ; limité à 3 envois / 10 min.

Les emails passent par **l'API HTTP de SendGrid** (`POST
https://api.sendgrid.com/v3/mail/send`, HTTPS). L'offre gratuite de Render
bloque tout le trafic SMTP sortant (ports 25, 465 et 587). `RESEND_API_KEY`,
`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_HOST`, `SMTP_PORT`, `GMAIL_USER`
et `GMAIL_APP_PASSWORD` ne sont **plus utilisées** : tu peux les retirer de
Render (un avertissement le rappelle dans les logs tant qu'elles existent).

### Configuration

À créer dans **Render → ton service → Environment** (jamais dans le code ni
dans un commit — voir aussi `.env.example`) :

| Variable | Où l'obtenir |
|---|---|
| `SENDGRID_API_KEY` | SendGrid → **Settings → API Keys** → *Create API Key* (accès restreint, permission **Mail Send**). |
| `EMAIL_FROM` | Facultatif. Par défaut `Papote <papotelangues@icloud.com>`. L'adresse doit être **vérifiée** dans SendGrid → **Settings → Sender Authentication** (*Single Sender Verification* : SendGrid envoie un lien de confirmation à cette adresse), sinon SendGrid répond 403. |

Comportement :
- Sans `SENDGRID_API_KEY`, l'app fonctionne normalement : aucun email n'est
  envoyé, un avertissement est loggé au démarrage et à chaque envoi sauté
  (`[email] SENDGRID_API_KEY not set - skipping ...`). Jamais de crash.
- Un envoi échoué (réseau, 429, 5xx) est retenté une fois ; une erreur de
  configuration (clé invalide → 401, expéditeur non vérifié → 403) est loggée
  avec la réponse de SendGrid et une indication de correction. Un email qui
  échoue ne fait jamais échouer l'inscription ni la demande de
  réinitialisation.
- Délivrabilité : envoyer « de la part de » une adresse `@icloud.com` depuis
  SendGrid échoue au contrôle DMARC d'iCloud, donc une partie des emails peut
  arriver en spam. Pour une délivrabilité fiable, authentifie un nom de domaine
  dans SendGrid (*Domain Authentication*) et mets `EMAIL_FROM` sur ce domaine.

## Mot de passe oublié

Un lien « Mot de passe oublié ? » sur la page de connexion envoie un email
(même helper SendGrid) avec un lien de réinitialisation valable 1 heure
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
  événements : `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.updated`, `customer.subscription.deleted` (l'app
  ajoute elle-même les événements manquants au démarrage, voir la page Admin).

**Factures** : à chaque paiement (premier mois via `checkout.session.completed`,
renouvellements via `invoice.paid`), l'app crée une facture numérotée en
continu (`PAP-2026-00001`, `PAP-2026-00002`…), l'envoie par email avec le PDF
en pièce jointe (`lib/invoice.js`, au design de Papote) et la rend
téléchargeable dans **Profil → Mes factures** (`GET /api/invoices`,
`GET /api/invoices/<numéro>.pdf`, réservé au titulaire). Un même paiement
renvoyé par Stripe ne crée ni deuxième facture ni deuxième email.
L'émetteur vient des variables des mentions légales (`LEGAL_PUBLISHER`,
`LEGAL_ADDRESS`, `LEGAL_SIRET`, `LEGAL_CONTACT_EMAIL`). La mention TVA par
défaut est « TVA non applicable, art. 293 B du CGI » (micro-entreprise) ; si tu
factures la TVA, remplace-la avec `INVOICE_VAT_NOTE`.

**Virements sur ton compte** : Stripe reverse automatiquement l'argent encaissé
vers le compte bancaire renseigné dans ton Dashboard Stripe (Paramètres →
Comptes bancaires / Payouts). Cette app ne touche jamais à tes coordonnées
bancaires — c'est à faire une seule fois, directement dans Stripe.

## Vocabulaire étendu (Wiktionary + fréquences)

Chaque langue reçoit jusqu'à **15 000 mots** classés par fréquence et répartis sur
les 6 niveaux (A1 → C2), avec leur sens en anglais et, le plus souvent, en
français. Sources libres (CC BY-SA) : Wiktionary (via
`Vuizur/Wiktionary-Dictionaries`) et les listes de fréquence OpenSubtitles de
`hermitdave/FrequencyWords`. Détails, licence et procédure de mise à jour :
[`content/wiktionary/SOURCES.md`](content/wiktionary/SOURCES.md) ; script :
`scripts/course/import-wiktionary.js`. Les mots rédigés à la main restent
prioritaires ; les mots importés sont rangés par nature (Noms, Verbes,
Adjectifs, Adverbes, Mots grammaticaux). Sans sens français, l'appli affiche le
sens anglais avec une étiquette « EN ». Le serveur garde en mémoire les
`COURSE_CACHE_LANGS` langues les plus récentes (8 par défaut).

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
