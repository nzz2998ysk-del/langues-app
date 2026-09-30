const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mwen", "ou", "li", "nou", "nou (vous)", "yo"];
const V = (t, gl, lvl, v, o) => verb(P, t, gl, lvl, { present: P.map((p) => p.split(" ")[0] + " " + v), passe: P.map((p) => p.split(" ")[0] + " te " + v), progressif: P.map((p) => p.split(" ")[0] + " ap " + v), futur: P.map((p) => p.split(" ")[0] + " pral " + v) }, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le créole haïtien a un vocabulaire majoritairement d'origine française mais une grammaire propre. Il s'écrit phonétiquement depuis 1979. L'audio utilise une voix française approchante.", "Haitian Creole has mostly French-derived vocabulary but its own grammar. It has a phonetic spelling since 1979. Audio uses a close French voice."),
  grammar: [
    G("ht-verbe", "A1", "⚡", ["Des verbes invariables", "Invariable verbs"], ["<p>Le verbe ne change jamais ; on ajoute des marqueurs : <b>te</b> (passé), <b>ap</b> (en cours), <b>pral / va</b> (futur). <i>Mwen manje, mwen te manje, m ap manje</i>.</p>", "<p>Verbs never change; markers are added: <b>te</b> (past), <b>ap</b> (ongoing), <b>pral / va</b> (future). <i>Mwen manje, mwen te manje, m ap manje</i>.</p>"], [ex("Demen m pral lekòl.", "", "Demain je vais à l'école.", "Tomorrow I'm going to school.")]),
    G("ht-article", "A1", "🔗", ["L'article après le nom", "The article after the noun"], ["<p>L'article défini se place après : <i>liv la</i> (le livre), <i>chat la</i>, <i>moun nan</i> ; pluriel <b>yo</b> : <i>liv yo</i> (les livres).</p>", "<p>The definite article comes after: <i>liv la</i> (the book), <i>chat la</i>, <i>moun nan</i>; plural <b>yo</b>: <i>liv yo</i> (the books).</p>"], [ex("Kay la bèl.", "", "La maison est belle.", "The house is beautiful.")]),
    G("ht-pa", "A1", "🚫", ["La négation pa", "Negation with pa"], ["<p><b>pa</b> se place avant le verbe : <i>Mwen pa konprann</i>.</p>", "<p><b>pa</b> goes before the verb: <i>Mwen pa konprann</i> (I don't understand).</p>"], [ex("Li pa la.", "", "Il n'est pas là.", "He's not here.")]),
    G("ht-possessif", "A2", "👤", ["Le possessif", "Possessives"], ["<p>Le pronom suit le nom : <i>liv mwen</i> (mon livre), <i>manman ou</i> (ta mère), <i>kay nou</i> (notre maison).</p>", "<p>The pronoun follows the noun: <i>liv mwen</i> (my book), <i>manman ou</i> (your mother), <i>kay nou</i> (our house).</p>"], [ex("Kote papa w?", "", "Où est ton père ?", "Where's your father?")]),
  ],
  conj: {
    note: g("Le verbe reste identique ; seuls les marqueurs changent.", "The verb stays the same; only the markers change."),
    tenses: [{ id: "present", fr: "Présent / accompli", en: "Present / completed" }, { id: "passe", fr: "Passé (te)", en: "Past (te)" }, { id: "progressif", fr: "Progressif (ap)", en: "Progressive (ap)" }, { id: "futur", fr: "Futur (pral)", en: "Future (pral)" }],
    verbs: [V("manje", g("manger", "to eat"), "A1", "manje"), V("pale", g("parler", "to speak"), "A1", "pale"), V("travay", g("travailler", "to work"), "A1", "travay"), V("dòmi", g("dormir", "to sleep"), "A1", "dòmi")],
  },
  readings: [
    R("ht-r1", "A1", "Fanmi mwen", "Bonjou! Mwen rele Nadège. Mwen rete Pòtoprens. Mwen gen de frè ak yon sè. Chak dimanch nou manje diri ak pwa ansanm lakay grann mwen.", "", ["Bonjour ! Je m'appelle Nadège. J'habite à Port-au-Prince. J'ai deux frères et une sœur. Chaque dimanche, nous mangeons du riz aux haricots ensemble chez ma grand-mère.", "Hello! My name is Nadège. I live in Port-au-Prince. I have two brothers and a sister. Every Sunday we eat rice and beans together at my grandmother's."],
      [q("Que mangent-ils le dimanche ?", "What do they eat on Sundays?", [["Du riz aux haricots", "Rice and beans"], ["Des pâtes", "Pasta"], ["Du poisson", "Fish"]], 0)]),
  ],
  culture: [
    C("ht-c1", "A1", "🗽", ["1804", "1804"], ["<p>Haïti est devenue en 1804 la première république noire indépendante, après la révolution menée par Toussaint Louverture et Jean-Jacques Dessalines.</p>", "<p>In 1804 Haiti became the first independent Black republic, after the revolution led by Toussaint Louverture and Jean-Jacques Dessalines.</p>"]),
    C("ht-c2", "A2", "🎃", ["La soupe joumou", "Soup joumou"], ["<p>Soupe au giron mangée le 1<sup>er</sup> janvier pour célébrer l'indépendance ; inscrite au patrimoine de l'UNESCO en 2021.</p>", "<p>Pumpkin soup eaten on 1 January to celebrate independence; UNESCO-listed in 2021.</p>"]),
    C("ht-c3", "B1", "🗣️", ["Pwovèb", "Proverbs"], ["<p><i>Piti piti zwazo fè nich li</i> : petit à petit l'oiseau fait son nid.</p>", "<p><i>Piti piti zwazo fè nich li</i>: little by little the bird builds its nest.</p>"]),
  ],
};
