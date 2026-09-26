# Mes langues — app d'apprentissage (ES/EN/IT/HE)

Application web d'apprentissage des langues (espagnol, anglais, italien, hébreu)
avec inscription par email + mot de passe, comptes stockés sur un serveur
(PostgreSQL), mots de passe hachés avec bcrypt.

## Développement local

```
npm install
export JWT_SECRET=change-me
export DATABASE_URL=postgresql://user:pass@localhost:5432/langues_app
npm start
```

## Déploiement (Render)

Ce repo contient un `render.yaml` (Blueprint) qui provisionne :
- un service web Node (`npm start`)
- une base PostgreSQL gratuite
- la variable `JWT_SECRET` générée automatiquement
- `DATABASE_URL` reliée automatiquement à la base

## Abonnement payant (à venir)

`POST /api/subscribe` existe déjà comme point d'extension (renvoie 501
pour l'instant) — prêt à brancher Stripe Checkout plus tard.
