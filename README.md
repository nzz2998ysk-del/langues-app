# Mes langues — app d'apprentissage (39 langues)

Application web d'apprentissage des langues : anglais, espagnol, italien, hébreu,
chinois mandarin, portugais, russe, allemand, japonais, plus 30 langues
supplémentaires en module « débutant » (français, hindi, coréen, arabe, turc,
néerlandais, grec, polonais, suédois, vietnamien, latin, norvégien, irlandais,
indonésien, haut valyrien, ukrainien, finnois, danois, roumain, tchèque, zoulou,
hawaïen, swahili, gallois, hongrois, gaélique écossais, créole haïtien,
espéranto, klingon, navajo). Inscription par email + mot de passe (comptes sur
PostgreSQL, mots de passe hachés bcrypt), compte administrateur, paiement par
abonnement (Stripe) et facture envoyée par email.

## Design

L'app entière suit le langage visuel **iOS 27 « Liquid Glass »**, de façon
uniforme : les 6 pages d'habillage (connexion, profil, idées, admin,
réinitialisation, abonnement), la chrome d'`app.html` (accueil, barre du haut,
barre d'onglets, écran de chargement) et les 272 pages de contenu embarquées
pour les 39 langues.

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

Outils : `scripts/liquid-glass.js` convertit une page en tokens (utilisé par
les générateurs, donc toute langue générée plus tard a ce design dès sa
création) ; `node scripts/apply-liquid-glass.js` réapplique la conversion à
tout `ALL_PAGES` (idempotent, `--dry-run` pour vérifier).

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

Chaque compte a une page `/profile` (lien « 🧑 Profil » sur l'accueil) pour
choisir son prénom affiché et sa **langue de base** — celle qu'on parle déjà,
utilisée comme point de départ pour apprendre les autres. Par défaut c'est le
français (langue dans laquelle l'essentiel du contenu existant est rédigé),
mais n'importe laquelle des 39 langues peut être choisie ; ça personnalise la
salutation sur l'accueil. Traduire tout le contenu des leçons dans chaque
langue de base possible est un chantier à part, pas encore fait.

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

Le compte dont l'email correspond à la variable `ADMIN_EMAIL` (par défaut
`raphael.sanguinetti@icloud.com`) devient automatiquement administrateur à
l'inscription ou à la connexion. Un lien "⚙️ Admin" apparaît alors sur l'accueil,
menant vers `/admin` : la grille des 117 interrupteurs premium/gratuit décrite
ci-dessus, plus les statistiques (comptes, abonnés, revenu encaissé). Décoché =
gratuit pour tout le monde. Un compte admin a toujours accès à tout, y compris
le contenu payant.

## Sécurité

Un audit manuel (OWASP Top 10) a été fait sur le code ; corrections appliquées :
en-têtes de sécurité (`X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS en production), algorithme JWT
explicitement restreint à `HS256`, validation email resserrée (rejette les
caractères pouvant casser du HTML), échappement HTML systématique des valeurs
utilisateur dans les emails (nom, email, message de suggestion), limitation de
débit sur les endpoints sensibles (`/api/checkout`, `/api/lang-order`,
`/api/suggestions`), et vérification d'origine sur les messages `postMessage`
entre l'accueil et les iframes de langue. La vérification de signature des
webhooks Stripe (HMAC + comparaison à temps constant) était déjà correcte.
`npm audit` ne remonte aucune vulnérabilité connue dans les dépendances.

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

## Contenu "v1" / "débutant" des langues ajoutées

- Chinois, portugais, russe, allemand, japonais : module « v1 » (8 thèmes de
  vocabulaire, 6 points de grammaire, 4 lectures) — plus léger que les 4 langues
  historiques (hébreu/espagnol/anglais/italien), qui représentent chacune
  plusieurs méga-octets de contenu accumulé.
- Les 30 langues suivantes (français, hindi, coréen, arabe, turc, néerlandais,
  grec, polonais, suédois, vietnamien, latin, norvégien, irlandais, indonésien,
  haut valyrien, ukrainien, finnois, danois, roumain, tchèque, zoulou, hawaïen,
  swahili, gallois, hongrois, gaélique écossais, créole haïtien, espéranto,
  klingon, navajo) ont un module encore plus resserré, volontairement : 3 thèmes
  de vocabulaire (salutations, nombres, couleurs), 3 points de grammaire et une
  courte lecture. Les traductions viennent des connaissances de Claude et n'ont
  pas été relues par un locuteur natif — à vérifier avant un usage sérieux,
  particulièrement pour les langues les moins courantes (haut valyrien, klingon,
  navajo, zoulou, hawaïen, gaélique écossais...).

Le contenu de chaque langue peut être approfondi une par une par la suite.
