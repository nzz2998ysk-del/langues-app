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

Utilisés pour l'email de bienvenue à l'inscription et la facture envoyée après
un paiement. À configurer sur Render :
- `RESEND_API_KEY` — créer un compte gratuit sur resend.com, générer une clé API.
- `EMAIL_FROM` — expéditeur (le domaine `onboarding@resend.dev` fonctionne sans
  configuration DNS, pratique pour démarrer ; un domaine propre peut être vérifié
  plus tard dans Resend pour envoyer depuis ta propre adresse).

Sans `RESEND_API_KEY`, l'app fonctionne normalement mais aucun email n'est
envoyé (juste un avertissement dans les logs).

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
