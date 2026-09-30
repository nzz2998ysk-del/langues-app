const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["já", "ty", "on / ona", "my", "vy", "oni"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le tchèque se lit comme il s'écrit. Accent toujours sur la première syllabe ; l'accent aigu (á) indique une voyelle longue. Le son ř est unique au tchèque.", "Czech is read as written. Stress is always on the first syllable; the acute (á) marks a long vowel. The sound ř is unique to Czech."),
  grammar: [
    G("cs-sons", "A1", "🔤", ["Háček et čárka", "Háček and čárka"], ["<p>Le háček (ˇ) modifie la consonne : <b>č</b> = tch, <b>š</b> = ch, <b>ž</b> = j, <b>ř</b> = r+j roulé. La čárka (´) allonge la voyelle.</p>", "<p>The háček (ˇ) changes the consonant: <b>č</b> = ch, <b>š</b> = sh, <b>ž</b> = zh, <b>ř</b> = rolled r+zh. The čárka (´) lengthens the vowel.</p>"], [ex("Dobrý den! Děkuji.", "", "Bonjour ! Merci.", "Hello! Thank you.")]),
    G("cs-genre", "A1", "⚥", ["Genres, pas d'articles", "Genders, no articles"], ["<p>Masculin animé/inanimé, féminin (-a, -e), neutre (-o, -í). <i>pán, hrad, žena, město</i>.</p>", "<p>Masculine animate/inanimate, feminine (-a, -e), neuter (-o, -í). <i>pán, hrad, žena, město</i>.</p>"], [ex("To je moje auto.", "", "C'est ma voiture.", "This is my car.")]),
    G("cs-cas", "A2", "🧩", ["Sept cas", "Seven cases"], ["<p>Comme en polonais : <i>Praha → do Prahy</i> (gén.), <i>v Praze</i> (loc.), <i>Prahou</i> (instr.).</p>", "<p>As in Polish: <i>Praha → do Prahy</i> (gen.), <i>v Praze</i> (loc.), <i>Prahou</i> (instr.).</p>"], [ex("Bydlím v Praze.", "", "J'habite à Prague.", "I live in Prague.")]),
    G("cs-present", "A1", "⚡", ["Trois types de présent", "Three present patterns"], ["<p>-ám : <i>dělám, děláš…</i> ; -ím : <i>mluvím, mluvíš…</i> ; -u/-i : <i>jdu, jdeš…</i></p>", "<p>-ám: <i>dělám, děláš…</i>; -ím: <i>mluvím, mluvíš…</i>; -u/-i: <i>jdu, jdeš…</i></p>"], [ex("Mluvíte česky?", "", "Parlez-vous tchèque ?", "Do you speak Czech?")]),
    G("cs-passe", "A2", "⏪", ["Le passé", "The past"], ["<p>Participe en -l + auxiliaire aux 1<sup>re</sup> et 2<sup>e</sup> personnes : <i>dělal jsem</i> (j'ai fait), <i>dělala</i> (elle a fait).</p>", "<p>-l participle + auxiliary in 1st and 2nd persons: <i>dělal jsem</i> (I did), <i>dělala</i> (she did).</p>"], [ex("Včera jsem byl v kině.", "", "Hier je suis allé au cinéma.", "Yesterday I was at the cinema.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }],
    verbs: [
      V("být", g("être", "to be"), "A1", { present: ["jsem", "jsi", "je", "jsme", "jste", "jsou"] }, { irregular: true }),
      V("mít", g("avoir", "to have"), "A1", { present: ["mám", "máš", "má", "máme", "máte", "mají"] }, { irregular: true }),
      V("dělat", g("faire", "to do"), "A1", { present: ["dělám", "děláš", "dělá", "děláme", "děláte", "dělají"] }),
      V("mluvit", g("parler", "to speak"), "A1", { present: ["mluvím", "mluvíš", "mluví", "mluvíme", "mluvíte", "mluví"] }),
      V("jít", g("aller (à pied)", "to go (on foot)"), "A1", { present: ["jdu", "jdeš", "jde", "jdeme", "jdete", "jdou"] }, { irregular: true }),
    ],
  },
  readings: [
    R("cs-r1", "A1", "Praha", "Jmenuji se Tomáš a bydlím v Praze. Každý den jdu přes Karlův most do práce. Večer rád piju pivo s kamarády. V neděli jím se rodinou svíčkovou.", "", ["Je m'appelle Tomáš et j'habite à Prague. Tous les jours, je traverse le pont Charles pour aller au travail. Le soir, j'aime boire une bière avec des amis. Le dimanche, je mange de la svíčková en famille.", "My name is Tomáš and I live in Prague. Every day I cross Charles Bridge to go to work. In the evening I like drinking beer with friends. On Sunday I eat svíčková with my family."],
      [q("Quel pont Tomáš traverse-t-il ?", "Which bridge does Tomáš cross?", [["Le pont Charles", "Charles Bridge"], ["Le Tower Bridge", "Tower Bridge"], ["Le pont Neuf", "Pont Neuf"]], 0)]),
    R("cs-r2", "A2", "Robot", "Slovo „robot“ pochází z češtiny. Poprvé ho použil spisovatel Karel Čapek ve hře R.U.R. v roce 1920. Nápad na slovo ale dostal od svého bratra Josefa. Slovo souvisí se starým slovem „robota“, což znamená těžká práce.", "", ["Le mot « robot » vient du tchèque. L'écrivain Karel Čapek l'a utilisé pour la première fois dans la pièce R.U.R. en 1920. Mais l'idée du mot lui est venue de son frère Josef. Il est lié au vieux mot « robota », qui signifie travail pénible.", "The word 'robot' comes from Czech. Writer Karel Čapek first used it in the play R.U.R. in 1920. But the idea came from his brother Josef. It is related to the old word 'robota', meaning hard labour."],
      [q("Que signifie « robota » ?", "What does 'robota' mean?", [["Travail pénible", "Hard labour"], ["Machine", "Machine"], ["Métal", "Metal"]], 0)]),
  ],
  culture: [
    C("cs-c1", "A1", "🍺", ["La bière", "Beer"], ["<p>La République tchèque a la plus forte consommation de bière par habitant du monde ; la pils est née à Plzeň en 1842.</p>", "<p>Czechia has the world's highest beer consumption per person; pilsner was born in Plzeň in 1842.</p>"]),
    C("cs-c2", "A2", "🍄", ["La cueillette de champignons", "Mushroom picking"], ["<p>Un sport national : dès l'automne, les forêts se remplissent de cueilleurs.</p>", "<p>A national pastime: in autumn the forests fill with mushroom hunters.</p>"]),
    C("cs-c3", "B1", "📚", ["Kafka et Havel", "Kafka and Havel"], ["<p>Franz Kafka est né à Prague ; Václav Havel, dramaturge, devint président après la révolution de Velours (1989).</p>", "<p>Franz Kafka was born in Prague; playwright Václav Havel became president after the Velvet Revolution (1989).</p>"]),
  ],
};
