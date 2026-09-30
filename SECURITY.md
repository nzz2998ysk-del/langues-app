# Audit de sécurité — Papote

Audit complet du code (`server.js`, `lib/`, pages HTML, moteur `course/`), de la
configuration (`render.yaml`, `.env.example`), du schéma PostgreSQL et des
dépendances npm. Date : 30/09/2026.

Tests de régression : `test/security.test.js` (23 tests d'attaque HTTP contre
le vrai serveur et une vraie base PostgreSQL) :

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/langues_test npm test
```

La base de test est entièrement effacée à chaque lancement : ne jamais la faire
pointer vers des données réelles.

## Ce qui était déjà solide

- Requêtes SQL toutes paramétrées (`$1…`) ; seul `ORDER BY` était dynamique,
  via une liste blanche.
- Mots de passe en bcrypt (coût 12) ; comparaison à temps constant, même pour un
  email inconnu (pas d'énumération par le temps de réponse).
- JWT signé en HS256, algorithme imposé à la vérification (`alg: none` refusé).
- Cookie de session `httpOnly`, `SameSite=Lax`, `Secure` en production.
- Jetons de réinitialisation aléatoires (32 octets), stockés hachés (SHA-256),
  valables 1 h, à usage unique ; « mot de passe oublié » ne révèle pas si un
  compte existe.
- Webhook Stripe : signature HMAC vérifiée à temps constant, fenêtre de 5 min
  contre le rejeu.
- En-têtes : CSP same-origin, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en production, `x-powered-by` retiré.
- Contenu Premium (C1/C2) retiré côté serveur de la réponse API pour les
  comptes gratuits ; fichiers bruts `course/data/*.json` non servis.
- Échappement HTML systématique dans le moteur, l'admin et les emails.
- Aucun secret dans le dépôt ni dans l'historique git (`.env` ignoré) ;
  `npm audit` : **0 vulnérabilité**.

## Problèmes trouvés

| # | Gravité | Localisation | Problème | Statut |
|---|---|---|---|---|
| 1 | **Critique** | `server.js:24` (avant), `/api/signup`, `/api/login`, `initDb` | **Prise du rôle admin par pré-inscription.** L'adresse admin avait une valeur par défaut codée en dur, et le rôle était donné à quiconque s'inscrivait avec cette adresse, sans vérifier qu'il la possède (aucune vérification d'email). Sur un nouveau déploiement, ou tant que le propriétaire n'avait pas créé son compte, n'importe qui pouvait devenir administrateur. | ✅ Corrigé |
| 2 | **Élevée** | webhook Stripe (`server.js:350-400`) | **Premium à vie.** Seul `checkout.session.completed` était traité : un abonnement résilié ou impayé gardait Premium indéfiniment, et le statut de paiement de la session n'était pas vérifié. | ✅ Corrigé |
| 3 | **Élevée** | `authMiddleware` (`server.js:536`) | **Sessions irrévocables.** Un JWT volé restait valable 30 jours, même après une réinitialisation du mot de passe ; aucune déconnexion de tous les appareils. | ✅ Corrigé |
| 4 | **Élevée** | RGPD — aucune route | **Ni export ni suppression des données** (droits d'accès, de portabilité et d'effacement). Les clés étrangères (`payments`, `suggestions`) empêchaient même de supprimer un compte. | ✅ Corrigé |
| 5 | **Moyenne** | routes `async` d'Express 4 | Une erreur de base de données dans un handler async sans `try/catch` (routes admin, `/admin`…) devenait une promesse rejetée non gérée, ce qui fait planter Node 15+ (déni de service). Le gestionnaire d'erreur par défaut renvoyait aussi une page HTML avec la pile d'appels hors production (ex. JSON malformé). | ✅ Corrigé |
| 6 | **Moyenne** | toutes les routes POST/PUT/PATCH/DELETE | CSRF : la protection reposait uniquement sur `SameSite=Lax` et les corps JSON. | ✅ Renforcé |
| 7 | **Moyenne** | routes admin | **Aucune piste d'audit** des actions sensibles (Premium offert ou retiré, bascules Premium, statut des langues, niveaux, idées). | ✅ Corrigé |
| 8 | **Moyenne** | `/api/signup`, `/api/reset-password` | Mots de passe de 6 caractères acceptés. | ✅ Corrigé (8 minimum pour les nouveaux) |
| 9 | **Moyenne** | `course/sw.js` + déconnexion | Le mode hors-ligne met en cache des réponses API personnelles (progression, profil) qui restaient dans le navigateur après la déconnexion (appareil partagé). | ✅ Corrigé |
| 10 | Faible | `/api/course/:lang`, `/api/progress/:lang`, `/api/profile`, `/api/vocabulary?sort=` | `LANG_META[x]` acceptait les clés du prototype (`constructor`, `toString`…) : de la progression pouvait être stockée sous une « langue » `constructor`, et `sort=constructor` faisait une erreur SQL. | ✅ Corrigé |
| 11 | Faible | `/api/*` | Réponses API personnelles sans `Cache-Control`. | ✅ Corrigé (`no-store`) |
| 12 | Faible | `/api/internal/send-digest` | Comparaison du secret non constante en temps. | ✅ Corrigé |
| 13 | Faible | `/api/checkout` | URLs de retour Stripe construites à partir de l'en-tête `Host`. | ✅ Corrigé (`APP_URL`) |
| 14 | Faible | webhook Stripe | Le message d'erreur interne était renvoyé à l'appelant. | ✅ Corrigé |
| 15 | Faible | `lib/email.js` | Adresses email complètes dans les logs (données personnelles). | ✅ Corrigé (masquées) |
| 16 | Faible | `admin.html` (niveaux des mots) | Identifiant de mot injecté dans un `onchange` inline : un apostrophe dans le contenu aurait permis une injection JS (contenu non fourni par les utilisateurs). | ✅ Corrigé (`data-*`) |
| 17 | Faible | `render.yaml` | Adresse email personnelle de l'admin versionnée dans le dépôt. | ✅ Retirée (à saisir dans Render) |
| 18 | Moyenne | `server.js` (CSP) | `script-src 'unsafe-inline'` : n'importe quel script injecté aurait pu s'exécuter. | ✅ Corrigé : nonce par requête sur chaque `<script>`/`<style>` (y compris les 936 pages `srcdoc`), 41 gestionnaires `onclick=` remplacés par de la délégation, rapports de violation sur `/api/csp-report`. Seuls les attributs `style=""` restent autorisés (`style-src-attr`), ils ne peuvent pas exécuter de code |
| 19 | Moyenne | pool PostgreSQL | TLS vers la base sans vérification du certificat. | ✅ Corrigé : `DATABASE_SSL=auto` vérifie le certificat quand c'est possible ; sinon repli signalé dans `/admin` avec `DATABASE_SSL_CA` à fournir |
| 20 | Moyenne | exploitation | Pas de sauvegardes. | ✅ Corrigé : sauvegarde quotidienne chiffrée (GitHub Actions, 30 jours) + scripts de sauvegarde et de restauration testés ; date de la dernière sauvegarde visible dans `/admin`. La base Render gratuite expire quand même : passer à un plan payant reste recommandé |
| 21 | Moyenne | conformité | Pas de politique de confidentialité ni de mentions légales. | ✅ Corrigé : `/confidentialite` et `/mentions-legales` (y compris l'audio traité par le navigateur), liens depuis l'accueil et l'inscription ; identité de l'éditeur à renseigner (`LEGAL_*`) |
| 22 | Moyenne | admin | Pas de double authentification pour le compte admin. | ✅ Corrigé : TOTP obligatoire pour toutes les routes admin, 8 codes de secours à usage unique, protection contre le rejeu, secret chiffré (AES-256-GCM), sessions admin de 12 h |
| 23 | Faible | `rateLimited()` | Limiteur en mémoire : propre à chaque instance et remis à zéro au redémarrage. | ⏳ Acceptable avec une seule instance |
| 24 | Faible | `/api/signup` | « Un compte existe déjà avec cet email » permet de savoir si une adresse est inscrite. | ⏳ Compromis d'ergonomie assumé |
| 25 | Faible | `/api/login` | La limite par compte (10 essais / 15 min) permet de bloquer temporairement la connexion d'un tiers. | ⏳ Acceptable |
| 26 | Faible | `/api/progress` | Document JSON libre (≤ 200 ko par langue) sans schéma. | ⏳ Acceptable (données propres au compte) |

## Détail des corrections

**1. Rôle admin (critique).** `ADMIN_EMAIL` n'a plus de valeur par défaut. Le
rôle n'est jamais donné à l'inscription : il faut d'abord **prouver la
possession de l'adresse**, soit par le lien de confirmation envoyé dans l'email
de bienvenue (`GET /api/verify-email`, jeton aléatoire haché, 7 jours), soit par
un lien de réinitialisation du mot de passe. Les administrateurs existants
gardent leur rôle. Sans Resend configuré, aucun email ne part : pour un premier
déploiement, configurer `RESEND_API_KEY` avant de créer le compte admin.

**2. Premium et Stripe (élevée).** `checkout.session.completed` n'accorde
Premium que si `payment_status` vaut `paid` (ou `no_payment_required`), et
enregistre `stripe_customer_id` et `stripe_subscription_id`.
`customer.subscription.deleted` retire Premium ;
`customer.subscription.updated` le garde seulement si l'abonnement est
`active` ou `trialing`. **À faire dans Stripe** : ajouter ces deux événements
au webhook (Developers → Webhooks → endpoint → *Select events*).

**3. Sessions (élevée).** Chaque jeton porte la `token_version` du compte, vérifiée à chaque
requête (cache de 30 s). Réinitialiser le mot de passe, utiliser « Déconnecter
tous les appareils » (`POST /api/logout-all`) ou supprimer le compte
incrémente la version, ce qui invalide tous les jetons existants.

**4. RGPD (élevée).** `GET /api/account/export` renvoie un fichier JSON avec le compte, la
progression par langue, les idées et les factures (jamais le hash du mot de
passe). `DELETE /api/account` demande le mot de passe, supprime le compte, sa
progression et ses idées, et détache les factures (conservées pour la
comptabilité). Les deux actions sont disponibles dans `/profile`, section
« Mes données », traduite dans les 15 langues d'interface.

**5 à 17.** Les handlers async sont enveloppés globalement, et un gestionnaire
d'erreur JSON final ne renvoie jamais de pile ni de détail SQL ; les routes
`/api` inconnues répondent en JSON. Contrôle `Origin` / `Sec-Fetch-Site` sur
les requêtes qui modifient des données. Table `admin_audit` (admin, action,
cible, détails, IP, date), consultable dans `/admin` → « 🧾 Journal ».
Les autres points sont corrigés comme indiqué dans le tableau.

## Reste à faire (recommandations)

1. **Renseigner la configuration** signalée par `/admin` → « 🔐 Sécurité & configuration » :
   `RESEND_API_KEY` et `EMAIL_FROM`, les variables `LEGAL_*`, les secrets GitHub
   de sauvegarde `BACKUP_DATABASE_URL` et `BACKUP_PASSPHRASE`, et
   `DATABASE_SSL_CA` si le certificat ne peut pas être vérifié.
2. **Base Render** : passer à un plan payant (la base gratuite expire).
3. **Styles inline** : les attributs `style=""` restent autorisés. Risque faible,
   ils ne permettent pas d'exécuter du code.
4. **Logs** : définir une durée de conservation côté Render.
5. **Dépendances** : `npm audit` à chaque déploiement ; prévoir Express 5 et bcryptjs 3.
6. **Fichiers** : aucun upload utilisateur aujourd'hui. Si des uploads sont
   ajoutés, vérifier le type MIME réel et la taille, stocker hors du dossier web
   et servir avec `Content-Disposition: attachment`.
