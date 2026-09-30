const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mi", "thu", "e / i", "sinn", "sibh", "iad"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Gaélique écossais (Gàidhlig), langue celtique proche de l'irlandais. Pas de voix de synthèse dédiée : l'audio est approximatif.", "Scottish Gaelic (Gàidhlig), a Celtic language close to Irish. No dedicated speech voice: audio is approximate."),
  grammar: [
    G("gd-vso", "A1", "➡️", ["Verbe en tête", "Verb first"], ["<p><i>Tha mi sgìth</i> (je suis fatigué, littéralement « est moi fatigué »).</p>", "<p><i>Tha mi sgìth</i> (I'm tired, literally 'is me tired').</p>"], [ex("Tha i fuar an-diugh.", "", "Il fait froid aujourd'hui.", "It's cold today.")]),
    G("gd-agam", "A1", "🔑", ["Avoir = « à moi »", "Having = 'at me'"], ["<p><i>Tha càr agam</i> (j'ai une voiture). <i>agam, agad, aige, aice, againn, agaibh, aca</i>.</p>", "<p><i>Tha càr agam</i> (I have a car). <i>agam, agad, aige, aice, againn, agaibh, aca</i>.</p>"], [ex("A bheil Gàidhlig agad? — Tha, beagan.", "", "Parles-tu gaélique ? — Oui, un peu.", "Do you speak Gaelic? — Yes, a little.")]),
    G("gd-lenition", "A2", "🔀", ["La lénition", "Lenition"], ["<p>Un h s'ajoute après certaines consonnes : <i>mo mhàthair</i> (ma mère), <i>glè mhath</i> (très bien).</p>", "<p>An h is added after some consonants: <i>mo mhàthair</i> (my mother), <i>glè mhath</i> (very good).</p>"], [ex("Tha mi glè mhath, tapadh leat.", "", "Je vais très bien, merci.", "I'm very well, thank you.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }, { id: "passe", fr: "Passé", en: "Past" }, { id: "futur", fr: "Futur", en: "Future" }],
    verbs: [V("bi", g("être", "to be"), "A1", { present: ["tha mi", "tha thu", "tha e", "tha sinn", "tha sibh", "tha iad"], passe: ["bha mi", "bha thu", "bha e", "bha sinn", "bha sibh", "bha iad"], futur: ["bidh mi", "bidh thu", "bidh e", "bidh sinn", "bidh sibh", "bidh iad"] }, { irregular: true })],
  },
  readings: [
    R("gd-r1", "A1", "Mi fhìn", "Halò! Is mise Catrìona. Tha mi a' fuireach anns an Eilean Sgitheanach. Tha mi ag obair ann an taigh-òsta. Is toil leam ceòl.", "", ["Bonjour ! Je suis Catrìona. J'habite sur l'île de Skye. Je travaille dans un hôtel. J'aime la musique.", "Hello! I'm Catrìona. I live on the Isle of Skye. I work in a hotel. I like music."],
      [q("Où travaille Catrìona ?", "Where does Catrìona work?", [["Dans un hôtel", "In a hotel"], ["Dans une école", "In a school"], ["Sur un bateau", "On a boat"]], 0)]),
  ],
  culture: [
    C("gd-c1", "A1", "🏝️", ["Les Hébrides", "The Hebrides"], ["<p>Le gaélique est surtout parlé dans les Hébrides extérieures et les Highlands.</p>", "<p>Gaelic is mainly spoken in the Outer Hebrides and the Highlands.</p>"]),
    C("gd-c2", "A2", "🎶", ["Le cèilidh", "The cèilidh"], ["<p>Soirée de danse et de musique traditionnelles, ouverte à tous.</p>", "<p>A social evening of traditional dancing and music, open to all.</p>"]),
  ],
};
