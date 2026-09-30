const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["én", "te", "ő", "mi", "ti", "ők"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le hongrois n'est pas indo-européen (famille finno-ougrienne). Accent sur la première syllabe ; l'accent écrit (á, ő, ű) marque une voyelle longue. sz = s, s = ch, cs = tch, gy ≈ dj.", "Hungarian is not Indo-European (Finno-Ugric family). Stress on the first syllable; accents (á, ő, ű) mark long vowels. sz = s, s = sh, cs = ch, gy ≈ dy."),
  grammar: [
    G("hu-agglu", "A1", "🧱", ["Une langue agglutinante", "An agglutinative language"], ["<p>On ajoute des suffixes les uns après les autres : <i>ház</i> (maison) → <i>házam</i> (ma maison) → <i>házamban</i> (dans ma maison).</p>", "<p>Suffixes stack one after another: <i>ház</i> (house) → <i>házam</i> (my house) → <i>házamban</i> (in my house).</p>"], [ex("A házamban lakom.", "", "J'habite dans ma maison.", "I live in my house.")]),
    G("hu-harmonie", "A1", "🎼", ["Harmonie vocalique", "Vowel harmony"], ["<p>Les suffixes s'adaptent aux voyelles du mot : <i>házban</i> mais <i>kertben</i> (dans le jardin).</p>", "<p>Suffixes match the word's vowels: <i>házban</i> but <i>kertben</i> (in the garden).</p>"], [ex("Budapesten élek.", "", "Je vis à Budapest.", "I live in Budapest.")]),
    G("hu-genre", "A1", "🚫", ["Pas de genre", "No gender"], ["<p><b>ő</b> = il ou elle. Articles : <i>a/az</i> (le, la), <i>egy</i> (un).</p>", "<p><b>ő</b> = he or she. Articles: <i>a/az</i> (the), <i>egy</i> (a).</p>"], [ex("Ő a tanárom.", "", "C'est mon professeur (homme ou femme).", "He/She is my teacher.")]),
    G("hu-van", "A1", "🟰", ["Être et avoir", "To be and to have"], ["<p><i>van</i> (est) disparaît avec un attribut : <i>Anna magas</i> (Anna est grande). « Avoir » : <i>Nekem van egy kutyám</i> (j'ai un chien).</p>", "<p><i>van</i> (is) is dropped with a predicate: <i>Anna magas</i> (Anna is tall). 'Have': <i>Nekem van egy kutyám</i> (I have a dog).</p>"], [ex("Van időd?", "", "As-tu le temps ?", "Do you have time?")]),
    G("hu-defini", "B1", "🎯", ["Conjugaison définie / indéfinie", "Definite / indefinite conjugation"], ["<p>Le verbe change si l'objet est défini : <i>Látok egy házat</i> (je vois une maison) / <i>Látom a házat</i> (je vois la maison).</p>", "<p>The verb changes if the object is definite: <i>Látok egy házat</i> (I see a house) / <i>Látom a házat</i> (I see the house).</p>"], [ex("Szeretem a zenét.", "", "J'aime la musique.", "I love (the) music.")]),
  ],
  conj: {
    note: g("Présent, conjugaison indéfinie.", "Present tense, indefinite conjugation."),
    tenses: [{ id: "present", fr: "Présent (indéfini)", en: "Present (indefinite)" }],
    verbs: [
      V("lenni", g("être", "to be"), "A1", { present: ["vagyok", "vagy", "van", "vagyunk", "vagytok", "vannak"] }, { irregular: true }),
      V("beszél", g("parler", "to speak"), "A1", { present: ["beszélek", "beszélsz", "beszél", "beszélünk", "beszéltek", "beszélnek"] }),
      V("lakik", g("habiter", "to live"), "A1", { present: ["lakom", "laksz", "lakik", "lakunk", "laktok", "laknak"] }),
      V("megy", g("aller", "to go"), "A1", { present: ["megyek", "mész", "megy", "megyünk", "mentek", "mennek"] }, { irregular: true }),
      V("eszik", g("manger", "to eat"), "A1", { present: ["eszem", "eszel", "eszik", "eszünk", "esztek", "esznek"] }, { irregular: true }),
    ],
  },
  readings: [
    R("hu-r1", "A1", "Budapest", "Péter vagyok, Budapesten lakom. A Duna két részre osztja a várost: Budára és Pestre. Hétvégén termálfürdőbe megyek a barátaimmal. Utána lángost eszünk.", "", ["Je suis Péter, j'habite à Budapest. Le Danube divise la ville en deux : Buda et Pest. Le week-end, je vais aux bains thermaux avec mes amis. Ensuite nous mangeons des lángos.", "I'm Péter and I live in Budapest. The Danube divides the city in two: Buda and Pest. At weekends I go to the thermal baths with my friends. Afterwards we eat lángos."],
      [q("Où va Péter le week-end ?", "Where does Péter go at weekends?", [["Aux bains thermaux", "To the thermal baths"], ["À la montagne", "To the mountains"], ["Au musée", "To the museum"]], 0)]),
    R("hu-r2", "A2", "A Rubik-kocka", "A Rubik-kockát Rubik Ernő, egy magyar építész találta fel 1974-ben. Eredetileg a diákjainak készítette, hogy megértsék a térbeli mozgást. Ma a világ egyik legnépszerűbb játéka.", "", ["Le Rubik's Cube a été inventé en 1974 par Ernő Rubik, un architecte hongrois. Il l'a d'abord créé pour ses étudiants, pour qu'ils comprennent le mouvement dans l'espace. C'est aujourd'hui l'un des jeux les plus populaires au monde.", "The Rubik's Cube was invented in 1974 by Ernő Rubik, a Hungarian architect. He first made it for his students to help them understand movement in space. Today it's one of the world's most popular toys."],
      [q("Quel était le métier de Rubik ?", "What was Rubik's job?", [["Architecte", "Architect"], ["Médecin", "Doctor"], ["Musicien", "Musician"]], 0)]),
  ],
  culture: [
    C("hu-c1", "A1", "🌶️", ["Le paprika", "Paprika"], ["<p>Épice nationale, au cœur du goulash (<i>gulyás</i>, à l'origine une soupe de bouviers).</p>", "<p>The national spice, at the heart of goulash (<i>gulyás</i>, originally a herdsmen's soup).</p>"]),
    C("hu-c2", "A2", "♨️", ["Les bains", "Thermal baths"], ["<p>Budapest compte plus d'une centaine de sources thermales ; on y joue même aux échecs dans l'eau.</p>", "<p>Budapest has over a hundred thermal springs; people even play chess in the water.</p>"]),
    C("hu-c3", "B1", "👤", ["Nom de famille d'abord", "Family name first"], ["<p>En hongrois, le nom de famille précède le prénom : <i>Rubik Ernő</i>, <i>Liszt Ferenc</i>.</p>", "<p>In Hungarian the family name comes first: <i>Rubik Ernő</i>, <i>Liszt Ferenc</i>.</p>"]),
  ],
};
