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
débloque, langue par langue, du feedback plus poussé, des leçons et des
exercices avancés — géré depuis `/admin` avec 3 fonctionnalités à cocher
(Feedback avancé / Leçons avancées / Exercices avancés). Chaque compte peut
aussi réorganiser librement l'ordre des cartes de langues sur l'accueil (bouton
« ↕️ Réorganiser », glisser-déposer, ordre sauvegardé par compte).

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
