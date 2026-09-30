const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mimi", "wewe", "yeye", "sisi", "ninyi", "wao"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
const conj = (st) => ({
  present: ["nina", "una", "ana", "tuna", "mna", "wana"].map((p) => p + st),
  passe: ["nili", "uli", "ali", "tuli", "mli", "wali"].map((p) => p + st),
  futur: ["nita", "uta", "ata", "tuta", "mta", "wata"].map((p) => p + st),
});
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le swahili s'écrit en alphabet latin et se lit comme il s'écrit ; l'accent tombe sur l'avant-dernière syllabe.", "Swahili uses the Latin alphabet and is read as written; stress falls on the second-to-last syllable."),
  grammar: [
    G("sw-verbe", "A1", "🧩", ["Le verbe en briques", "Verbs as building blocks"], ["<p>sujet + temps + radical : <i>ni-na-soma</i> (je lis), <i>tu-li-soma</i> (nous avons lu), <i>wa-ta-soma</i> (ils liront).</p>", "<p>subject + tense + stem: <i>ni-na-soma</i> (I read), <i>tu-li-soma</i> (we read, past), <i>wa-ta-soma</i> (they will read).</p>"], [ex("Ninasoma Kiswahili.", "", "J'étudie le swahili.", "I'm studying Swahili.")]),
    G("sw-classes", "A2", "🗂️", ["Les classes nominales", "Noun classes"], ["<p>Au lieu du genre, des classes avec préfixes singulier/pluriel : <i>m-tu / wa-tu</i> (personne/s), <i>ki-tabu / vi-tabu</i> (livre/s), <i>m-ti / mi-ti</i> (arbre/s).</p>", "<p>Instead of gender, noun classes with singular/plural prefixes: <i>m-tu / wa-tu</i> (person/people), <i>ki-tabu / vi-tabu</i> (book/s), <i>m-ti / mi-ti</i> (tree/s).</p>"], [ex("Watoto wawili wanasoma vitabu.", "", "Deux enfants lisent des livres.", "Two children are reading books.")]),
    G("sw-negation", "A2", "🚫", ["La négation", "Negation"], ["<p>Préfixes négatifs : <i>si-</i> (je), <i>hu-</i> (tu), <i>ha-</i> (il)… et -a final devient -i au présent : <i>sisomi</i> (je ne lis pas).</p>", "<p>Negative prefixes: <i>si-</i> (I), <i>hu-</i> (you), <i>ha-</i> (he/she)… and final -a becomes -i in the present: <i>sisomi</i> (I don't read).</p>"], [ex("Sielewi.", "", "Je ne comprends pas.", "I don't understand.")]),
    G("sw-kuwa", "A1", "🟰", ["ni et kuwa na", "ni and kuwa na"], ["<p><b>ni</b> = est (invariable) : <i>Mimi ni mwalimu</i>. « Avoir » : <b>-na</b> : <i>Nina kaka</i> (j'ai un frère).</p>", "<p><b>ni</b> = is/am/are: <i>Mimi ni mwalimu</i>. 'Have': <b>-na</b>: <i>Nina kaka</i> (I have a brother).</p>"], [ex("Una watoto?", "", "As-tu des enfants ?", "Do you have children?")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent (-na-)", en: "Present (-na-)" }, { id: "passe", fr: "Passé (-li-)", en: "Past (-li-)" }, { id: "futur", fr: "Futur (-ta-)", en: "Future (-ta-)" }],
    verbs: [
      V("kusoma", g("lire, étudier", "to read, study"), "A1", conj("soma")),
      V("kupika", g("cuisiner", "to cook"), "A1", conj("pika")),
      V("kusema", g("dire, parler", "to say, speak"), "A1", conj("sema")),
      V("kula", g("manger", "to eat"), "A1", conj("kula"), { irregular: true }),
      V("kunywa", g("boire", "to drink"), "A1", conj("kunywa"), { irregular: true }),
    ],
  },
  readings: [
    R("sw-r1", "A1", "Familia yangu", "Jina langu ni Amani. Ninaishi Dar es Salaam. Nina dada mmoja na kaka wawili. Baba yangu ni mwalimu na mama yangu ni daktari. Ninapenda kucheza mpira.", "", ["Je m'appelle Amani. J'habite à Dar es Salaam. J'ai une sœur et deux frères. Mon père est enseignant et ma mère est médecin. J'aime jouer au football.", "My name is Amani. I live in Dar es Salaam. I have one sister and two brothers. My father is a teacher and my mother is a doctor. I like playing football."],
      [q("Combien de frères a Amani ?", "How many brothers does Amani have?", [["Deux", "Two"], ["Un", "One"], ["Trois", "Three"]], 0)]),
    R("sw-r2", "A2", "Safari", "Mwaka jana tulikwenda Serengeti. Tuliona simba, tembo na twiga. Asubuhi mapema tuliona jua likichomoza juu ya uwanda. Ilikuwa safari nzuri sana.", "", ["L'année dernière, nous sommes allés au Serengeti. Nous avons vu des lions, des éléphants et des girafes. Tôt le matin, nous avons vu le soleil se lever sur la plaine. C'était un très beau voyage.", "Last year we went to the Serengeti. We saw lions, elephants and giraffes. Early in the morning we watched the sun rise over the plain. It was a wonderful trip."],
      [q("Quels animaux ont-ils vus ?", "Which animals did they see?", [["Lions, éléphants, girafes", "Lions, elephants, giraffes"], ["Ours et loups", "Bears and wolves"], ["Pingouins", "Penguins"]], 0)]),
  ],
  culture: [
    C("sw-c1", "A1", "🐢", ["Pole pole", "Pole pole"], ["<p>« Doucement, doucement » : une philosophie du temps calme, très présente en Afrique de l'Est.</p>", "<p>'Slowly, slowly': a relaxed attitude to time, common in East Africa.</p>"]),
    C("sw-c2", "A2", "🌍", ["Une langue véhiculaire", "A lingua franca"], ["<p>Parlé par plus de 100 millions de personnes (Tanzanie, Kenya, Ouganda, RDC…), le swahili emprunte beaucoup à l'arabe : <i>safari</i> (voyage), <i>kitabu</i> (livre).</p>", "<p>Spoken by 100+ million people (Tanzania, Kenya, Uganda, DRC…), Swahili borrows much from Arabic: <i>safari</i> (journey), <i>kitabu</i> (book).</p>"]),
    C("sw-c3", "B1", "🦁", ["Hakuna matata", "Hakuna matata"], ["<p>« Pas de soucis » : l'expression existait bien avant le Roi Lion.</p>", "<p>'No worries': the phrase existed long before The Lion King.</p>"]),
  ],
};
