# Mes langues — app d'apprentissage (9 langues)

Application web d'apprentissage des langues (hébreu, espagnol, anglais, italien
+ chinois mandarin, portugais, russe, allemand, japonais en v1) avec inscription
par email + mot de passe (comptes sur PostgreSQL, mots de passe hachés bcrypt),
compte administrateur, gestion des fonctionnalités gratuites/payantes, paiement
par abonnement (Stripe) et facture envoyée par email.

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
menant vers `/admin` : une page à cocher pour choisir quelles langues (ou autres
fonctionnalités) sont payantes. Décoché = gratuit pour tout le monde. Un compte
admin a toujours accès à tout, y compris le contenu payant.

## Emails transactionnels (Resend)

Utilisés pour l'email de bienvenue à l'inscription et la facture envoyée après
un paiement. À configurer sur Render :
- `RESEND_API_KEY` — créer un compte gratuit sur resend.com, générer une clé API.
- `EMAIL_FROM` — expéditeur (le domaine `onboarding@resend.dev` fonctionne sans
  configuration DNS, pratique pour démarrer ; un domaine propre peut être vérifié
  plus tard dans Resend pour envoyer depuis ta propre adresse).

Sans `RESEND_API_KEY`, l'app fonctionne normalement mais aucun email n'est
envoyé (juste un avertissement dans les logs).

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

## Contenu "v1" des 5 nouvelles langues

Le chinois, portugais, russe, allemand et japonais ont un module de démarrage
(vocabulaire par thèmes, grammaire de base, exercices interactifs, quelques
lectures) — volontairement plus léger que les 4 langues historiques, qui
représentent chacune plusieurs méga-octets de contenu accumulé. Le contenu de
chaque nouvelle langue peut être approfondi langue par langue par la suite.
