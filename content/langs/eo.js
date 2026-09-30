const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mi", "vi", "li / ŝi", "ni", "vi", "ili"];
const V = (t, gl, lvl, st, o) => verb(P, t, gl, lvl, { present: P.map(() => st + "as"), passe: P.map(() => st + "is"), futur: P.map(() => st + "os") }, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("L'espéranto, créé en 1887 par L. L. Zamenhof, a une grammaire parfaitement régulière. Aucune voix de synthèse n'existe : l'audio utilise une voix italienne approchante.", "Esperanto, created in 1887 by L. L. Zamenhof, has perfectly regular grammar. No speech voice exists: audio uses a close Italian voice."),
  grammar: [
    G("eo-finales", "A1", "🔚", ["Les terminaisons", "Word endings"], ["<p>-o nom (<i>domo</i>), -a adjectif (<i>granda</i>), -e adverbe (<i>rapide</i>), -j pluriel (<i>grandaj domoj</i>).</p>", "<p>-o noun (<i>domo</i>), -a adjective (<i>granda</i>), -e adverb (<i>rapide</i>), -j plural (<i>grandaj domoj</i>).</p>"], [ex("La belaj floroj estas ruĝaj.", "", "Les belles fleurs sont rouges.", "The beautiful flowers are red.")]),
    G("eo-verbe", "A1", "⚡", ["Six terminaisons verbales", "Six verb endings"], ["<p>Pour tous les verbes et toutes les personnes : -as présent, -is passé, -os futur, -us conditionnel, -u impératif, -i infinitif. Aucun irrégulier !</p>", "<p>For every verb and person: -as present, -is past, -os future, -us conditional, -u imperative, -i infinitive. No irregulars!</p>"], [ex("Mi lernas, mi lernis, mi lernos.", "", "J'apprends, j'ai appris, j'apprendrai.", "I learn, I learned, I will learn.")]),
    G("eo-accusatif", "A2", "🎯", ["L'accusatif -n", "The accusative -n"], ["<p>Le COD prend -n, ce qui libère l'ordre des mots : <i>Mi amas vin</i> = <i>Vin mi amas</i>.</p>", "<p>The direct object takes -n, freeing word order: <i>Mi amas vin</i> = <i>Vin mi amas</i>.</p>"], [ex("Ŝi legas libron.", "", "Elle lit un livre.", "She reads a book.")]),
    G("eo-affixes", "B1", "🧩", ["Affixes", "Affixes"], ["<p><i>mal-</i> contraire (<i>bona → malbona</i>), <i>-in-</i> féminin (<i>frato → fratino</i>), <i>-ej-</i> lieu (<i>lerni → lernejo</i>, école), <i>-ist-</i> métier.</p>", "<p><i>mal-</i> opposite (<i>bona → malbona</i>), <i>-in-</i> female (<i>frato → fratino</i>), <i>-ej-</i> place (<i>lerni → lernejo</i>, school), <i>-ist-</i> profession.</p>"], [ex("La lernejo estas malgranda.", "", "L'école est petite.", "The school is small.")]),
  ],
  conj: {
    note: g("Même forme pour toutes les personnes.", "Same form for every person."),
    tenses: [{ id: "present", fr: "Présent (-as)", en: "Present (-as)" }, { id: "passe", fr: "Passé (-is)", en: "Past (-is)" }, { id: "futur", fr: "Futur (-os)", en: "Future (-os)" }],
    verbs: [V("esti", g("être", "to be"), "A1", "est"), V("havi", g("avoir", "to have"), "A1", "hav"), V("paroli", g("parler", "to speak"), "A1", "parol"), V("iri", g("aller", "to go"), "A1", "ir"), V("manĝi", g("manger", "to eat"), "A1", "manĝ")],
  },
  readings: [
    R("eo-r1", "A1", "Saluton!", "Saluton! Mi nomiĝas Petro. Mi loĝas en Francio. Mi lernas Esperanton ĉar mi volas paroli kun homoj el la tuta mondo. Hieraŭ mi skribis leteron al amiko en Japanio.", "", ["Salut ! Je m'appelle Pierre. J'habite en France. J'apprends l'espéranto parce que je veux parler avec des gens du monde entier. Hier, j'ai écrit une lettre à un ami au Japon.", "Hello! My name is Peter. I live in France. I'm learning Esperanto because I want to speak with people from all over the world. Yesterday I wrote a letter to a friend in Japan."],
      [q("À qui Petro a-t-il écrit ?", "Who did Petro write to?", [["À un ami au Japon", "A friend in Japan"], ["À sa mère", "His mother"], ["À son professeur", "His teacher"]], 0)]),
  ],
  culture: [
    C("eo-c1", "A1", "🟢", ["L'étoile verte", "The green star"], ["<p>Symbole de l'espéranto : le vert pour l'espoir, les cinq branches pour les continents.</p>", "<p>Esperanto's symbol: green for hope, five points for the continents.</p>"]),
    C("eo-c2", "A2", "🏠", ["Pasporta Servo", "Pasporta Servo"], ["<p>Un réseau d'hébergement gratuit entre espérantistes du monde entier, créé en 1974.</p>", "<p>A free hosting network among Esperanto speakers worldwide, founded in 1974.</p>"]),
  ],
};
