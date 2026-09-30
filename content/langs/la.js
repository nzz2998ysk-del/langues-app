const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["ego", "tu", "is / ea", "nos", "vos", "ei / eae"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Latin classique. La prononciation (restituée) est approximative : aucune voix de synthèse latine n'existe, l'audio utilise une voix italienne.", "Classical Latin. Pronunciation (restored) is approximate: there is no Latin speech voice, so audio uses an Italian voice."),
  grammar: [
    G("la-cas", "A1", "🧩", ["Les cas", "Cases"], ["<p>La fonction d'un mot se voit à sa terminaison : <i>puella</i> (sujet), <i>puellam</i> (COD), <i>puellae</i> (de la fille / à la fille). L'ordre des mots est libre.</p>", "<p>A word's function shows in its ending: <i>puella</i> (subject), <i>puellam</i> (object), <i>puellae</i> (of / to the girl). Word order is free.</p>"], [ex("Puella rosam amat.", "", "La jeune fille aime la rose.", "The girl loves the rose.")]),
    G("la-decl1", "A1", "📜", ["1re déclinaison (-a)", "1st declension (-a)"], ["<p>Surtout féminins : <i>rosa, rosam, rosae, rosae, rosā</i> ; pluriel <i>rosae, rosas, rosarum, rosis</i>.</p>", "<p>Mostly feminine: <i>rosa, rosam, rosae, rosae, rosā</i>; plural <i>rosae, rosas, rosarum, rosis</i>.</p>"], [ex("Nautae aquam amant.", "", "Les marins aiment l'eau.", "Sailors love the water.")]),
    G("la-decl2", "A2", "📜", ["2e déclinaison (-us, -um)", "2nd declension (-us, -um)"], ["<p>Masculins en -us (<i>dominus, dominum, domini</i>) et neutres en -um (<i>templum</i>).</p>", "<p>Masculines in -us (<i>dominus, dominum, domini</i>) and neuters in -um (<i>templum</i>).</p>"], [ex("Dominus servum vocat.", "", "Le maître appelle l'esclave.", "The master calls the slave.")]),
    G("la-verbe", "A1", "⚡", ["Le verbe à la fin", "The verb at the end"], ["<p>Le verbe se place souvent en fin de phrase et le pronom sujet est omis : <i>Romam amo</i> (j'aime Rome).</p>", "<p>The verb often ends the sentence and subject pronouns are dropped: <i>Romam amo</i> (I love Rome).</p>"], [ex("Veni, vidi, vici.", "", "Je suis venu, j'ai vu, j'ai vaincu.", "I came, I saw, I conquered.")]),
    G("la-parfait", "A2", "⏪", ["Le parfait", "The perfect"], ["<p>Action accomplie : <i>amavi, amavisti, amavit…</i> Souvent un radical différent : <i>venio → veni</i>, <i>video → vidi</i>.</p>", "<p>Completed action: <i>amavi, amavisti, amavit…</i> Often a different stem: <i>venio → veni</i>, <i>video → vidi</i>.</p>"], [ex("Caesar Galliam vicit.", "", "César a vaincu la Gaule.", "Caesar conquered Gaul.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }, { id: "imparfait", fr: "Imparfait", en: "Imperfect" }, { id: "parfait", fr: "Parfait", en: "Perfect" }],
    verbs: [
      V("esse", g("être", "to be"), "A1", { present: ["sum", "es", "est", "sumus", "estis", "sunt"], imparfait: ["eram", "eras", "erat", "eramus", "eratis", "erant"], parfait: ["fui", "fuisti", "fuit", "fuimus", "fuistis", "fuerunt"] }, { irregular: true }),
      V("amare", g("aimer", "to love"), "A1", { present: ["amo", "amas", "amat", "amamus", "amatis", "amant"], imparfait: ["amabam", "amabas", "amabat", "amabamus", "amabatis", "amabant"], parfait: ["amavi", "amavisti", "amavit", "amavimus", "amavistis", "amaverunt"] }),
      V("habere", g("avoir", "to have"), "A1", { present: ["habeo", "habes", "habet", "habemus", "habetis", "habent"], imparfait: ["habebam", "habebas", "habebat", "habebamus", "habebatis", "habebant"], parfait: ["habui", "habuisti", "habuit", "habuimus", "habuistis", "habuerunt"] }),
      V("ire", g("aller", "to go"), "A2", { present: ["eo", "is", "it", "imus", "itis", "eunt"], imparfait: ["ibam", "ibas", "ibat", "ibamus", "ibatis", "ibant"], parfait: ["ii", "isti", "iit", "iimus", "istis", "ierunt"] }, { irregular: true }),
    ],
  },
  readings: [
    R("la-r1", "A1", "Roma", "Roma est urbs magna. In urbe sunt multa templa et viae. Marcus in foro ambulat. Iulia in villa habitat et rosas amat.", "", ["Rome est une grande ville. Dans la ville, il y a beaucoup de temples et de rues. Marcus se promène sur le forum. Julia habite dans une villa et aime les roses.", "Rome is a great city. In the city there are many temples and streets. Marcus walks in the forum. Julia lives in a villa and loves roses."],
      [q("Que fait Marcus ?", "What does Marcus do?", [["Il se promène sur le forum", "He walks in the forum"], ["Il dort", "He sleeps"], ["Il écrit", "He writes"]], 0)]),
    R("la-r2", "A2", "Sententiae", "Carpe diem. Errare humanum est. Alea iacta est. Mens sana in corpore sano. Hae sententiae Latinae hodie quoque notae sunt.", "", ["Cueille le jour. L'erreur est humaine. Le sort en est jeté. Un esprit sain dans un corps sain. Ces maximes latines sont encore connues aujourd'hui.", "Seize the day. To err is human. The die is cast. A sound mind in a sound body. These Latin sayings are still known today."],
      [q("Que signifie « Errare humanum est » ?", "What does 'Errare humanum est' mean?", [["L'erreur est humaine", "To err is human"], ["Cueille le jour", "Seize the day"], ["Le sort en est jeté", "The die is cast"]], 0)]),
  ],
  culture: [
    C("la-c1", "A1", "🏛️", ["Une langue mère", "A mother tongue"], ["<p>Le latin a donné naissance aux langues romanes : français, italien, espagnol, portugais, roumain…</p>", "<p>Latin gave rise to the Romance languages: French, Italian, Spanish, Portuguese, Romanian…</p>"]),
    C("la-c2", "A2", "⛪", ["Langue du Vatican", "Language of the Vatican"], ["<p>Le latin reste la langue officielle du Saint-Siège ; il sert aussi aux noms scientifiques (<i>Homo sapiens</i>).</p>", "<p>Latin remains the official language of the Holy See and is used for scientific names (<i>Homo sapiens</i>).</p>"]),
    C("la-c3", "B1", "📖", ["Auteurs classiques", "Classical authors"], ["<p>Cicéron, Virgile (L'Énéide), Ovide (Les Métamorphoses) et César (La Guerre des Gaules).</p>", "<p>Cicero, Virgil (the Aeneid), Ovid (Metamorphoses) and Caesar (the Gallic War).</p>"]),
  ],
};
