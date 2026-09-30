const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["ja", "ty", "on / ona", "my", "wy", "oni / one"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le polonais utilise l'alphabet latin avec des lettres propres (ą, ę, ł, ś, ż, ź…). L'accent tombe presque toujours sur l'avant-dernière syllabe.", "Polish uses the Latin alphabet with extra letters (ą, ę, ł, ś, ż, ź…). Stress almost always falls on the second-to-last syllable."),
  grammar: [
    G("pl-lettres", "A1", "🔤", ["Lettres et sons", "Letters and sounds"], ["<p><b>ł</b> = w anglais, <b>w</b> = v, <b>sz</b> = ch, <b>cz</b> = tch, <b>rz/ż</b> = j, <b>ą/ę</b> = voyelles nasales.</p>", "<p><b>ł</b> = English w, <b>w</b> = v, <b>sz</b> = sh, <b>cz</b> = ch, <b>rz/ż</b> = s in 'pleasure', <b>ą/ę</b> = nasal vowels.</p>"], [ex("Dzień dobry! Cześć!", "", "Bonjour ! Salut !", "Good morning! Hi!")]),
    G("pl-genre", "A1", "⚥", ["Trois genres, pas d'articles", "Three genders, no articles"], ["<p>Masculin (consonne : <i>dom</i>), féminin (-a : <i>kawa</i>), neutre (-o/-e : <i>okno</i>).</p>", "<p>Masculine (consonant: <i>dom</i>), feminine (-a: <i>kawa</i>), neuter (-o/-e: <i>okno</i>).</p>"], [ex("To jest mój dom.", "", "C'est ma maison.", "This is my house.")]),
    G("pl-cas", "A2", "🧩", ["Sept cas", "Seven cases"], ["<p>Nominatif, génitif, datif, accusatif, instrumental, locatif, vocatif. <i>kawa → kawę</i> (acc.) → <i>kawy</i> (gén.).</p>", "<p>Nominative, genitive, dative, accusative, instrumental, locative, vocative. <i>kawa → kawę</i> (acc.) → <i>kawy</i> (gen.).</p>"], [ex("Poproszę kawę z mlekiem.", "", "Un café au lait, s'il vous plaît.", "A coffee with milk, please."), ex("Nie piję kawy.", "", "Je ne bois pas de café.", "I don't drink coffee.")]),
    G("pl-passe", "A2", "⏪", ["Le passé", "The past"], ["<p>Accord en genre : <i>byłem</i> (je, homme), <i>byłam</i> (je, femme), <i>był / była / było</i>.</p>", "<p>Agrees in gender: <i>byłem</i> (I, male), <i>byłam</i> (I, female), <i>był / była / było</i>.</p>"], [ex("Wczoraj byłam w kinie.", "", "Hier je suis allée au cinéma.", "Yesterday I was at the cinema (female).")]),
    G("pl-aspect", "B1", "🔁", ["L'aspect", "Aspect"], ["<p>Paires imperfectif/perfectif : <i>robić / zrobić</i>, <i>pisać / napisać</i>. Le perfectif au présent a un sens futur : <i>zrobię</i> (je ferai).</p>", "<p>Imperfective/perfective pairs: <i>robić / zrobić</i>, <i>pisać / napisać</i>. A perfective in present form means future: <i>zrobię</i> (I'll do it).</p>"], [ex("Jutro napiszę list.", "", "Demain j'écrirai la lettre.", "Tomorrow I'll write the letter.")]),
    G("pl-pan", "A1", "🎩", ["Pan / Pani", "Pan / Pani"], ["<p>Le vouvoiement utilise <b>Pan</b> (monsieur) / <b>Pani</b> (madame) + verbe à la 3<sup>e</sup> personne : <i>Czy Pan mówi po angielsku?</i></p>", "<p>Formal 'you' uses <b>Pan</b> (sir) / <b>Pani</b> (madam) + 3rd-person verb: <i>Czy Pan mówi po angielsku?</i></p>"], [ex("Jak się Pani nazywa?", "", "Comment vous appelez-vous, madame ?", "What's your name, madam?")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }, { id: "passe", fr: "Passé (masculin)", en: "Past (masculine)" }],
    verbs: [
      V("być", g("être", "to be"), "A1", { present: ["jestem", "jesteś", "jest", "jesteśmy", "jesteście", "są"], passe: ["byłem", "byłeś", "był", "byliśmy", "byliście", "byli"] }, { irregular: true }),
      V("mieć", g("avoir", "to have"), "A1", { present: ["mam", "masz", "ma", "mamy", "macie", "mają"], passe: ["miałem", "miałeś", "miał", "mieliśmy", "mieliście", "mieli"] }, { irregular: true }),
      V("robić", g("faire", "to do"), "A1", { present: ["robię", "robisz", "robi", "robimy", "robicie", "robią"], passe: ["robiłem", "robiłeś", "robił", "robiliśmy", "robiliście", "robili"] }),
      V("mówić", g("parler", "to speak"), "A1", { present: ["mówię", "mówisz", "mówi", "mówimy", "mówicie", "mówią"], passe: ["mówiłem", "mówiłeś", "mówił", "mówiliśmy", "mówiliście", "mówili"] }),
      V("iść", g("aller (à pied)", "to go (on foot)"), "A1", { present: ["idę", "idziesz", "idzie", "idziemy", "idziecie", "idą"], passe: ["szedłem", "szedłeś", "szedł", "szliśmy", "szliście", "szli"] }, { irregular: true }),
    ],
  },
  readings: [
    R("pl-r1", "A1", "Kraków", "Mam na imię Kasia. Mieszkam w Krakowie. Codziennie rano piję kawę na Rynku. Lubię spacerować nad Wisłą. W weekend jem pierogi u babci.", "", ["Je m'appelle Kasia. J'habite à Cracovie. Tous les matins, je bois un café sur la place du Marché. J'aime me promener au bord de la Vistule. Le week-end, je mange des pierogi chez ma grand-mère.", "My name is Kasia. I live in Kraków. Every morning I drink coffee on the Market Square. I like walking along the Vistula. At weekends I eat pierogi at my grandma's."],
      [q("Où Kasia mange-t-elle des pierogi ?", "Where does Kasia eat pierogi?", [["Chez sa grand-mère", "At her grandma's"], ["Au restaurant", "At a restaurant"], ["Au travail", "At work"]], 0)]),
    R("pl-r2", "A2", "Wigilia", "Wigilia to kolacja w wieczór przed Bożym Narodzeniem. Zaczyna się, kiedy na niebie pojawi się pierwsza gwiazdka. Na stole jest dwanaście potraw i jedno wolne miejsce dla niespodziewanego gościa.", "", ["La Wigilia est le dîner de la veille de Noël. Il commence quand la première étoile apparaît dans le ciel. Sur la table, il y a douze plats et une place libre pour un invité inattendu.", "Wigilia is the Christmas Eve supper. It begins when the first star appears in the sky. There are twelve dishes on the table and one empty place for an unexpected guest."],
      [q("Pourquoi laisse-t-on une place libre ?", "Why is a place left empty?", [["Pour un invité inattendu", "For an unexpected guest"], ["Pour le Père Noël", "For Santa"], ["Par erreur", "By mistake"]], 0)]),
  ],
  culture: [
    C("pl-c1", "A1", "🥟", ["Les pierogi", "Pierogi"], ["<p>Raviolis farcis de pommes de terre et fromage blanc (<i>ruskie</i>), de viande, de chou ou de fruits.</p>", "<p>Dumplings filled with potato and cottage cheese (<i>ruskie</i>), meat, cabbage or fruit.</p>"]),
    C("pl-c2", "A2", "🎂", ["Imieniny", "Name days"], ["<p>La fête du prénom est aussi importante que l'anniversaire ; on chante <i>Sto lat</i> (cent ans).</p>", "<p>Name days are as important as birthdays; people sing <i>Sto lat</i> (a hundred years).</p>"]),
    C("pl-c3", "B1", "🎹", ["Chopin et Skłodowska-Curie", "Chopin and Skłodowska-Curie"], ["<p>Frédéric Chopin et Maria Skłodowska-Curie, double prix Nobel, sont deux grandes figures polonaises.</p>", "<p>Fryderyk Chopin and Maria Skłodowska-Curie, double Nobel laureate, are two great Polish figures.</p>"]),
  ],
};
