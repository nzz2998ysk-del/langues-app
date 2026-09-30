const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["fi / i", "ti", "e / hi", "ni", "chi", "nhw"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Gallois (Cymraeg), langue celtique. w et y sont des voyelles ; ll = l soufflé, dd = th (anglais this), f = v, ff = f. Formes orales standard.", "Welsh (Cymraeg), a Celtic language. w and y are vowels; ll = breathy l, dd = th in 'this', f = v, ff = f. Standard spoken forms."),
  grammar: [
    G("cy-sons", "A1", "🔤", ["Lettres galloises", "Welsh letters"], ["<p><b>ll</b> (Llanelli) : langue en position l, on souffle. <b>ch</b> = kh. <b>dd</b> = th sonore. <b>w</b> = ou (<i>cwm</i>).</p>", "<p><b>ll</b> (Llanelli): tongue in l position, blow air. <b>ch</b> = kh. <b>dd</b> = voiced th. <b>w</b> = oo (<i>cwm</i>).</p>"], [ex("Bore da! Diolch.", "", "Bonjour ! Merci.", "Good morning! Thanks.")]),
    G("cy-bod", "A1", "🟰", ["Le verbe bod (être)", "The verb bod (to be)"], ["<p>Phrases de base : <i>Dw i'n hapus</i> (je suis content), <i>Mae hi'n athrawes</i> (elle est enseignante). <b>'n / yn</b> relie le verbe à l'attribut.</p>", "<p>Basic sentences: <i>Dw i'n hapus</i> (I'm happy), <i>Mae hi'n athrawes</i> (she's a teacher). <b>'n / yn</b> links the verb to what follows.</p>"], [ex("Dw i'n dysgu Cymraeg.", "", "J'apprends le gallois.", "I'm learning Welsh.")]),
    G("cy-mutation", "A2", "🔀", ["Les mutations", "Mutations"], ["<p>Comme en irlandais, l'initiale change : <i>cath</i> (chat) → <i>ei gath</i> (son chat à lui), <i>ei chath</i> (son chat à elle), <i>fy nghath</i> (mon chat).</p>", "<p>As in Irish, initial consonants change: <i>cath</i> (cat) → <i>ei gath</i> (his cat), <i>ei chath</i> (her cat), <i>fy nghath</i> (my cat).</p>"], [ex("Croeso i Gymru!", "", "Bienvenue au pays de Galles !", "Welcome to Wales!")]),
    G("cy-oui", "A1", "🙊", ["Oui / non", "Yes / no"], ["<p>Comme en irlandais, on répond avec le verbe : <i>Wyt ti'n barod? — Ydw / Nac ydw.</i></p>", "<p>As in Irish, you answer with the verb: <i>Wyt ti'n barod? — Ydw / Nac ydw.</i> (Are you ready? — I am / I'm not.)</p>"], [ex("Wyt ti'n siarad Cymraeg? — Ydw.", "", "Parles-tu gallois ? — Oui.", "Do you speak Welsh? — Yes.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent de bod", en: "Present of bod" }, { id: "passe", fr: "Passé de mynd (aller)", en: "Past of mynd (go)" }],
    verbs: [
      V("bod", g("être", "to be"), "A1", { present: ["dw i", "rwyt ti", "mae e / hi", "dyn ni", "dych chi", "maen nhw"] }, { irregular: true }),
      V("mynd", g("aller", "to go"), "A1", { passe: ["es i", "est ti", "aeth e / hi", "aethon ni", "aethoch chi", "aethon nhw"] }, { irregular: true }),
    ],
  },
  readings: [
    R("cy-r1", "A1", "Amdana i", "Helo! Rhys dw i. Dw i'n byw yng Nghaerdydd. Dw i'n hoffi rygbi a cherddoriaeth. Mae gen i chwaer.", "", ["Salut ! Je suis Rhys. J'habite à Cardiff. J'aime le rugby et la musique. J'ai une sœur.", "Hello! I'm Rhys. I live in Cardiff. I like rugby and music. I have a sister."],
      [q("Quel sport aime Rhys ?", "Which sport does Rhys like?", [["Le rugby", "Rugby"], ["Le tennis", "Tennis"], ["La natation", "Swimming"]], 0)]),
  ],
  culture: [
    C("cy-c1", "A1", "🐉", ["Y Ddraig Goch", "Y Ddraig Goch"], ["<p>Le dragon rouge orne le drapeau gallois.</p>", "<p>The red dragon features on the Welsh flag.</p>"]),
    C("cy-c2", "A2", "🎤", ["L'Eisteddfod", "The Eisteddfod"], ["<p>Grand festival de poésie, de chant et de musique en gallois, organisé chaque année.</p>", "<p>A major annual festival of Welsh-language poetry, singing and music.</p>"]),
    C("cy-c3", "B1", "📈", ["Une langue qui revit", "A living revival"], ["<p>Grâce à l'enseignement bilingue, le gallois est parlé par environ un habitant sur cinq au pays de Galles.</p>", "<p>Thanks to bilingual education, Welsh is spoken by around one in five people in Wales.</p>"]),
  ],
};
