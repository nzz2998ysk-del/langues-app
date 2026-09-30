const { g, ex, G, R, C } = require("./_helpers");
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Haut valyrien, langue construite par David J. Peterson pour Game of Thrones. Son vocabulaire publié est limité : nous ne présentons que des formes attestées. L'audio utilise une voix approchante.", "High Valyrian, a constructed language by David J. Peterson for Game of Thrones. Its published vocabulary is limited: only attested forms are shown. Audio uses a close voice."),
  grammar: [
    G("val-conlang", "A1", "🐉", ["Une langue construite", "A constructed language"], ["<p>Créée pour la fiction, avec une grammaire complète mais un lexique publié restreint.</p>", "<p>Created for fiction, with a full grammar but a limited published lexicon.</p>"], [ex("Valar morghulis.", "", "Tous les hommes doivent mourir.", "All men must die.")]),
    G("val-cas", "A2", "🧩", ["Des déclinaisons", "Declensions"], ["<p>Comme le latin, les noms changent de terminaison selon leur fonction dans la phrase.</p>", "<p>Like Latin, nouns change their endings according to their role in the sentence.</p>"], [ex("Valar dohaeris.", "", "Tous les hommes doivent servir.", "All men must serve.")]),
    G("val-genres", "B1", "🌗", ["Quatre genres", "Four genders"], ["<p>Lunaire, solaire, terrestre et aquatique : des classes grammaticales plutôt que des sexes.</p>", "<p>Lunar, solar, terrestrial and aquatic: grammatical classes rather than sexes.</p>"]),
  ],
  readings: [R("val-r1", "A1", "Valar morghulis", "Valar morghulis. Valar dohaeris.", "", ["« Tous les hommes doivent mourir. » — « Tous les hommes doivent servir. » (salutation et réponse de la série)", "'All men must die.' — 'All men must serve.' (greeting and reply from the series)"])],
  culture: [
    C("val-c1", "A1", "📺", ["Game of Thrones", "Game of Thrones"], ["<p>Le haut valyrien est la langue savante de Westeros et d'Essos, comparable au latin dans notre monde.</p>", "<p>High Valyrian is the learned language of Westeros and Essos, like Latin in our world.</p>"]),
    C("val-c2", "A2", "✍️", ["David J. Peterson", "David J. Peterson"], ["<p>Linguiste et créateur de langues (dothraki, valyrien) ; le valyrien est aussi proposé par des applications d'apprentissage grand public.</p>", "<p>Linguist and language creator (Dothraki, Valyrian); Valyrian is even offered by mainstream learning apps.</p>"]),
  ],
};
