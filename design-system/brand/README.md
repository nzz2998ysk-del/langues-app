# Papote — logo et mascotte

Dépose ici (GitHub → ce dossier → **Add file → Upload files**) :

| Fichier | Contenu |
|---|---|
| `logo.png` | le logo Papote (chat + bulle « Papote »), PNG le plus grand possible |
| `mascotte.png` | la planche de la mascotte : grille **4 × 4** d'expressions, ligne par ligne |

Puis lance (ou demande à Claude de lancer) :

```bash
pip install pillow && python3 scripts/brand/process-brand.py
```

Le script retire le faux damier de transparence, découpe les 16 expressions
(`mascot/<humeur>.png`), génère le logo optimisé, le favicon et les icônes
d'application, et écrit `brand.json`. L'application les utilise automatiquement :
logo sur la page d'accueil, l'animation d'ouverture et l'accueil ; mascotte dans
les exercices, fins de leçon, révisions, examens, badges…

Ordre attendu des 16 expressions dans la grille :

| | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| ligne 1 | hello (content) | wave (clin d'œil, salut) | question (?) | wink (clin d'œil ✨) |
| ligne 2 | sleep (dort) | amazed (yeux étoilés) | shy (de dos) | laugh (rit) |
| ligne 3 | surprised (surpris) | cool (lunettes) | stretch (s'étire) | love (cœur) |
| ligne 4 | cheer (encourage) | peek (se cache) | sad (triste) | celebrate (roule de joie) |
