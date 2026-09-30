const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mina (ngi-)", "wena (u-)", "yena (u-)", "thina (si-)", "nina (ni-)", "bona (ba-)"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le zoulou est une langue bantoue d'Afrique du Sud, avec des consonnes « clics » : c (dental), q (palatal), x (latéral). Aucune voix de synthèse zouloue n'est garantie : l'audio peut être approximatif.", "Zulu is a Bantu language of South Africa with click consonants: c (dental), q (palatal), x (lateral). A Zulu speech voice isn't guaranteed: audio may be approximate."),
  grammar: [
    G("zu-clics", "A1", "👄", ["Les clics", "Clicks"], ["<p><b>c</b> : claquement de langue contre les dents (« tss »). <b>q</b> : claquement sec au palais. <b>x</b> : claquement latéral (pour faire avancer un cheval). <i>ukudla</i> (nourriture), <i>iqanda</i> (œuf).</p>", "<p><b>c</b>: tongue against the teeth ('tsk'). <b>q</b>: a sharp pop on the palate. <b>x</b>: side click (as to urge a horse). <i>ukudla</i> (food), <i>iqanda</i> (egg).</p>"], [ex("Ngiyabonga.", "", "Merci.", "Thank you.")]),
    G("zu-classes", "A2", "🗂️", ["Classes nominales", "Noun classes"], ["<p>Préfixes singulier/pluriel : <i>umuntu / abantu</i> (personne/s), <i>isitsha / izitsha</i> (plat/s), <i>inja / izinja</i> (chien/s).</p>", "<p>Singular/plural prefixes: <i>umuntu / abantu</i> (person/people), <i>isitsha / izitsha</i> (dish/es), <i>inja / izinja</i> (dog/s).</p>"], [ex("Abantu abaningi.", "", "Beaucoup de gens.", "Many people.")]),
    G("zu-present", "A1", "⚡", ["Le présent avec -ya-", "Present with -ya-"], ["<p>sujet + <b>ya</b> + verbe quand le verbe termine la phrase : <i>Ngiyahamba</i> (je pars). Avec un complément, -ya- disparaît : <i>Ngihamba ekhaya</i>.</p>", "<p>subject + <b>ya</b> + verb when the verb ends the sentence: <i>Ngiyahamba</i> (I'm leaving). With an object, -ya- drops: <i>Ngihamba ekhaya</i>.</p>"], [ex("Uyakhuluma isiZulu?", "", "Parles-tu zoulou ?", "Do you speak Zulu?")]),
    G("zu-sawubona", "A1", "👋", ["Sawubona", "Sawubona"], ["<p>« Je te vois » : on répond <i>Yebo, sawubona</i>. Au pluriel : <i>Sanibonani</i>.</p>", "<p>'I see you': the reply is <i>Yebo, sawubona</i>. To several people: <i>Sanibonani</i>.</p>"], [ex("Unjani? — Ngikhona.", "", "Comment vas-tu ? — Je vais bien.", "How are you? — I'm fine.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent (forme longue)", en: "Present (long form)" }, { id: "passe", fr: "Passé récent (-ile)", en: "Recent past (-ile)" }],
    verbs: [
      V("ukuhamba", g("partir, marcher", "to go, walk"), "A1", { present: ["ngiyahamba", "uyahamba", "uyahamba", "siyahamba", "niyahamba", "bayahamba"], passe: ["ngihambile", "uhambile", "uhambile", "sihambile", "nihambile", "bahambile"] }),
      V("ukubona", g("voir", "to see"), "A1", { present: ["ngiyabona", "uyabona", "uyabona", "siyabona", "niyabona", "bayabona"], passe: ["ngibonile", "ubonile", "ubonile", "sibonile", "nibonile", "babonile"] }),
      V("ukukhuluma", g("parler", "to speak"), "A1", { present: ["ngiyakhuluma", "uyakhuluma", "uyakhuluma", "siyakhuluma", "niyakhuluma", "bayakhuluma"], passe: ["ngikhulumile", "ukhulumile", "ukhulumile", "sikhulumile", "nikhulumile", "bakhulumile"] }),
    ],
  },
  readings: [
    R("zu-r1", "A1", "Igama lami", "Sawubona! Igama lami nguThandi. Ngihlala eThekwini. Ngiyafunda enyuvesi. Ngithanda umculo nokudansa.", "", ["Bonjour ! Je m'appelle Thandi. J'habite à Durban. J'étudie à l'université. J'aime la musique et la danse.", "Hello! My name is Thandi. I live in Durban. I study at university. I love music and dancing."],
      [q("Où habite Thandi ?", "Where does Thandi live?", [["À Durban", "In Durban"], ["Au Cap", "In Cape Town"], ["À Paris", "In Paris"]], 0)]),
  ],
  culture: [
    C("zu-c1", "A1", "🤝", ["Ubuntu", "Ubuntu"], ["<p>« Umuntu ngumuntu ngabantu » : une personne est une personne grâce aux autres. Philosophie de solidarité popularisée par Nelson Mandela et Desmond Tutu.</p>", "<p>'Umuntu ngumuntu ngabantu': a person is a person through other people. A philosophy of solidarity popularised by Nelson Mandela and Desmond Tutu.</p>"]),
    C("zu-c2", "A2", "🇿🇦", ["Onze langues officielles", "Eleven official languages"], ["<p>Le zoulou est la langue maternelle la plus parlée d'Afrique du Sud, qui compte de nombreuses langues officielles.</p>", "<p>Zulu is the most widely spoken home language in South Africa, a country with many official languages.</p>"]),
    C("zu-c3", "B1", "🎶", ["Le chant", "Singing"], ["<p>Les chœurs a cappella (isicathamiya), popularisés par Ladysmith Black Mambazo, sont emblématiques.</p>", "<p>A cappella choral singing (isicathamiya), popularised by Ladysmith Black Mambazo, is iconic.</p>"]),
  ],
};
