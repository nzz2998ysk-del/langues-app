const { g, ex, q, formsVerb } = require("./_helpers");
const F = ["infinitif / infinitive", "présent / present", "prétérit / past", "parfait / perfect", "impératif / imperative"];
const V = (t, gl, lvl, f, o) => formsVerb(F, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Norvégien bokmål, la forme écrite la plus répandue (l'autre est le nynorsk). Lettres propres : æ, ø, å. Les dialectes varient beaucoup à l'oral.", "Norwegian Bokmål, the most common written standard (the other is Nynorsk). Extra letters: æ, ø, å. Spoken dialects vary a lot."),
  grammar: [
    { id: "nb-genre", level: "A1", icon: "⚥", title: g("Trois genres et l'article suffixé", "Three genders and the suffixed article"), body: g("<p><i>en bil → bilen</i> (masc.), <i>ei/en bok → boka/boken</i> (fém.), <i>et hus → huset</i> (neutre).</p>", "<p><i>en bil → bilen</i> (masc.), <i>ei/en bok → boka/boken</i> (fem.), <i>et hus → huset</i> (neuter).</p>"), ex: [ex("Huset er stort.", "", "La maison est grande.", "The house is big.")] },
    { id: "nb-verbe", level: "A1", icon: "⚡", title: g("Verbes invariables", "Invariable verbs"), body: g("<p>Le présent finit en -r, identique pour toutes les personnes : <i>jeg snakker, du snakker, vi snakker</i>.</p>", "<p>The present ends in -r, the same for everyone: <i>jeg snakker, du snakker, vi snakker</i>.</p>"), ex: [ex("Snakker du norsk?", "", "Parles-tu norvégien ?", "Do you speak Norwegian?")] },
    { id: "nb-v2", level: "A1", icon: "2️⃣", title: g("Le verbe en 2e position", "Verb second"), body: g("<p><i>I dag <b>jobber</b> jeg hjemme</i> ; la négation <b>ikke</b> suit le verbe : <i>Jeg forstår ikke</i>.</p>", "<p><i>I dag <b>jobber</b> jeg hjemme</i>; the negation <b>ikke</b> follows the verb: <i>Jeg forstår ikke</i>.</p>"), ex: [ex("I morgen reiser vi til Bergen.", "", "Demain nous partons à Bergen.", "Tomorrow we're travelling to Bergen.")] },
    { id: "nb-double", level: "A2", icon: "👉", title: g("La double détermination", "Double definiteness"), body: g("<p>Avec un adjectif, on met l'article devant ET le suffixe : <i>den store bilen</i> (la grande voiture).</p>", "<p>With an adjective you use both a front article AND the suffix: <i>den store bilen</i> (the big car).</p>"), ex: [ex("Det gamle huset ligger ved fjorden.", "", "La vieille maison est au bord du fjord.", "The old house is by the fjord.")] },
    { id: "nb-futur", level: "A2", icon: "⏩", title: g("Le futur", "The future"), body: g("<p><b>skal</b> (intention) ou <b>kommer til å</b> (prévision) + infinitif : <i>Jeg skal reise</i>, <i>Det kommer til å regne</i>.</p>", "<p><b>skal</b> (intention) or <b>kommer til å</b> (prediction) + infinitive: <i>Jeg skal reise</i>, <i>Det kommer til å regne</i>.</p>"), ex: [ex("Vi skal gå på tur i helgen.", "", "Nous allons faire une randonnée ce week-end.", "We're going hiking at the weekend.")] },
  ],
  conj: {
    tenses: [{ id: "formes", fr: "Formes principales", en: "Main forms" }],
    verbs: [
      V("være", g("être", "to be"), "A1", ["å være", "er", "var", "har vært", "vær!"], { irregular: true }),
      V("ha", g("avoir", "to have"), "A1", ["å ha", "har", "hadde", "har hatt", "ha!"], { irregular: true }),
      V("snakke", g("parler", "to speak"), "A1", ["å snakke", "snakker", "snakket", "har snakket", "snakk!"]),
      V("gå", g("aller (à pied)", "to go (walk)"), "A1", ["å gå", "går", "gikk", "har gått", "gå!"], { irregular: true }),
      V("spise", g("manger", "to eat"), "A1", ["å spise", "spiser", "spiste", "har spist", "spis!"]),
      V("komme", g("venir", "to come"), "A1", ["å komme", "kommer", "kom", "har kommet", "kom!"], { irregular: true }),
    ],
  },
  readings: [
    { id: "nb-r1", level: "A1", title: "På tur", t: "Jeg heter Ingrid og jeg bor i Tromsø. Om vinteren er det mørkt nesten hele dagen, men vi kan se nordlyset. Om sommeren går jeg på tur i fjellet med familien min.", tr: g("Je m'appelle Ingrid et j'habite à Tromsø. En hiver, il fait nuit presque toute la journée, mais nous pouvons voir les aurores boréales. En été, je fais de la randonnée en montagne avec ma famille.", "My name is Ingrid and I live in Tromsø. In winter it's dark almost all day, but we can see the northern lights. In summer I go hiking in the mountains with my family."),
      q: [q("Que voit-on en hiver à Tromsø ?", "What can you see in winter in Tromsø?", [["Les aurores boréales", "The northern lights"], ["Le soleil de minuit", "The midnight sun"], ["Des palmiers", "Palm trees"]], 0)] },
    { id: "nb-r2", level: "A2", title: "Syttende mai", t: "Den syttende mai er Norges nasjonaldag. Barna går i tog gjennom byen med flagg, og mange har på seg bunad. Etterpå spiser de is og pølser. Dagen feirer grunnloven fra 1814.", tr: g("Le 17 mai est la fête nationale norvégienne. Les enfants défilent en cortège dans la ville avec des drapeaux, et beaucoup portent le bunad (costume traditionnel). Ensuite, ils mangent des glaces et des saucisses. Cette journée célèbre la Constitution de 1814.", "The seventeenth of May is Norway's national day. Children parade through town with flags and many wear a bunad (traditional costume). Afterwards they eat ice cream and hot dogs. The day celebrates the 1814 constitution."),
      q: [q("Que célèbre le 17 mai ?", "What does 17 May celebrate?", [["La Constitution de 1814", "The 1814 constitution"], ["Noël", "Christmas"], ["La fin de l'hiver", "The end of winter"]], 0)] },
  ],
  culture: [
    { id: "nb-c1", level: "A1", icon: "🏔️", title: g("Friluftsliv", "Friluftsliv"), body: g("<p>La « vie en plein air » : randonnée, ski et cabane (<i>hytte</i>) sont au cœur de la culture norvégienne.</p>", "<p>'Open-air living': hiking, skiing and the cabin (<i>hytte</i>) are central to Norwegian culture.</p>") },
    { id: "nb-c2", level: "A2", icon: "🥪", title: g("Matpakke", "Matpakke"), body: g("<p>Le déjeuner emporté : des tartines ouvertes avec du fromage brun (<i>brunost</i>), séparées par du papier.</p>", "<p>The packed lunch: open sandwiches with brown cheese (<i>brunost</i>), separated by paper.</p>") },
    { id: "nb-c3", level: "B1", icon: "✍️", title: g("Bokmål et nynorsk", "Bokmål and Nynorsk"), body: g("<p>Deux normes écrites officielles coexistent ; les élèves apprennent les deux. Le nynorsk est surtout utilisé dans l'ouest.</p>", "<p>Two official written standards coexist; pupils learn both. Nynorsk is used mainly in the west.</p>") },
  ],
};
