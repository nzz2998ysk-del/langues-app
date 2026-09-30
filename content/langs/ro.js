const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["eu", "tu", "el / ea", "noi", "voi", "ei / ele"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le roumain est une langue romane (proche de l'italien et du français) avec des lettres propres : ă, â, î, ș, ț.", "Romanian is a Romance language (close to Italian and French) with extra letters: ă, â, î, ș, ț."),
  grammar: [
    G("ro-article", "A1", "🔗", ["L'article défini collé", "The suffixed definite article"], ["<p>Particularité : l'article défini se colle à la fin du nom : <i>un băiat → băiatul</i> (le garçon), <i>o casă → casa</i> (la maison).</p>", "<p>A peculiarity: the definite article is attached to the end of the noun: <i>un băiat → băiatul</i> (the boy), <i>o casă → casa</i> (the house).</p>"], [ex("Casa este mare.", "", "La maison est grande.", "The house is big.")]),
    G("ro-genre", "A1", "⚥", ["Trois genres", "Three genders"], ["<p>Masculin, féminin et neutre (masculin au singulier, féminin au pluriel) : <i>un scaun → două scaune</i>.</p>", "<p>Masculine, feminine and neuter (masculine in the singular, feminine in the plural): <i>un scaun → două scaune</i>.</p>"], [ex("un tren, două trenuri", "", "un train, deux trains", "one train, two trains")]),
    G("ro-present", "A1", "⚡", ["Le présent", "Present tense"], ["<p>Quatre groupes ; beaucoup de verbes en -i prennent -esc : <i>vorbesc, vorbești, vorbește</i>.</p>", "<p>Four groups; many -i verbs take -esc: <i>vorbesc, vorbești, vorbește</i>.</p>"], [ex("Vorbiți franceza?", "", "Parlez-vous français ?", "Do you speak French?")]),
    G("ro-passe", "A2", "⏪", ["Le passé composé", "The compound past"], ["<p><i>am, ai, a, am, ați, au</i> + participe : <i>am mâncat</i> (j'ai mangé), <i>au plecat</i> (ils sont partis).</p>", "<p><i>am, ai, a, am, ați, au</i> + participle: <i>am mâncat</i> (I ate), <i>au plecat</i> (they left).</p>"], [ex("Ieri am fost la munte.", "", "Hier je suis allé à la montagne.", "Yesterday I went to the mountains.")]),
    G("ro-subj", "B1", "🌀", ["Le subjonctif « să »", "The 'să' subjunctive"], ["<p>Après vouloir, pouvoir, devoir… : <i>Vreau să merg</i> (je veux aller), <i>Trebuie să plec</i> (je dois partir).</p>", "<p>After want, can, must…: <i>Vreau să merg</i> (I want to go), <i>Trebuie să plec</i> (I must leave).</p>"], [ex("Pot să vă ajut?", "", "Puis-je vous aider ?", "Can I help you?")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }],
    verbs: [
      V("a fi", g("être", "to be"), "A1", { present: ["sunt", "ești", "este", "suntem", "sunteți", "sunt"] }, { irregular: true }),
      V("a avea", g("avoir", "to have"), "A1", { present: ["am", "ai", "are", "avem", "aveți", "au"] }, { irregular: true }),
      V("a vorbi", g("parler", "to speak"), "A1", { present: ["vorbesc", "vorbești", "vorbește", "vorbim", "vorbiți", "vorbesc"] }),
      V("a merge", g("aller, marcher", "to go, walk"), "A1", { present: ["merg", "mergi", "merge", "mergem", "mergeți", "merg"] }),
      V("a mânca", g("manger", "to eat"), "A1", { present: ["mănânc", "mănânci", "mănâncă", "mâncăm", "mâncați", "mănâncă"] }, { irregular: true }),
    ],
  },
  readings: [
    R("ro-r1", "A1", "Bunica", "Mă numesc Ioana și locuiesc în Cluj. În fiecare vară merg la bunica mea la țară. Ea are o grădină mare cu roșii și flori. Seara mâncăm împreună mămăligă cu brânză.", "", ["Je m'appelle Ioana et j'habite à Cluj. Chaque été, je vais chez ma grand-mère à la campagne. Elle a un grand jardin avec des tomates et des fleurs. Le soir, nous mangeons ensemble de la mămăligă au fromage.", "My name is Ioana and I live in Cluj. Every summer I go to my grandmother's in the countryside. She has a big garden with tomatoes and flowers. In the evening we eat mămăligă with cheese together."],
      [q("Où vit la grand-mère ?", "Where does the grandmother live?", [["À la campagne", "In the countryside"], ["À Bucarest", "In Bucharest"], ["Au bord de la mer", "By the sea"]], 0)]),
    R("ro-r2", "A2", "Mărțișorul", "Pe 1 martie, românii își dăruiesc mărțișoare: mici obiecte legate cu un șnur alb și roșu. Ele aduc noroc și anunță venirea primăverii. Multe femei poartă mărțișorul în piept toată luna.", "", ["Le 1er mars, les Roumains s'offrent des mărțișoare : de petits objets attachés à un cordon blanc et rouge. Ils portent chance et annoncent l'arrivée du printemps. Beaucoup de femmes les portent sur la poitrine tout le mois.", "On 1 March, Romanians give each other mărțișoare: small trinkets tied with a white and red string. They bring luck and herald spring. Many women wear them pinned to their chest all month."],
      [q("De quelles couleurs est le cordon ?", "What colours is the string?", [["Blanc et rouge", "White and red"], ["Bleu et jaune", "Blue and yellow"], ["Vert et or", "Green and gold"]], 0)]),
  ],
  culture: [
    C("ro-c1", "A1", "🌍", ["Une île latine", "A Latin island"], ["<p>Le roumain descend du latin parlé en Dacie ; un francophone reconnaît beaucoup de mots : <i>carte</i> (livre), <i>masă</i> (table).</p>", "<p>Romanian descends from the Latin spoken in Dacia; many words are recognisable: <i>carte</i> (book), <i>masă</i> (table).</p>"]),
    C("ro-c2", "A2", "🏰", ["La Transylvanie", "Transylvania"], ["<p>Château de Bran, églises fortifiées saxonnes et monastères peints de Bucovine font la richesse du patrimoine.</p>", "<p>Bran Castle, Saxon fortified churches and the painted monasteries of Bucovina are highlights of the heritage.</p>"]),
    C("ro-c3", "B1", "🎭", ["Brâncuși et Ionesco", "Brâncuși and Ionesco"], ["<p>Le sculpteur Constantin Brâncuși et le dramaturge Eugène Ionesco sont d'origine roumaine.</p>", "<p>Sculptor Constantin Brâncuși and playwright Eugène Ionesco were Romanian-born.</p>"]),
  ],
};
