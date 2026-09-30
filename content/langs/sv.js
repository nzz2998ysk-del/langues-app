const { g, ex, q, formsVerb } = require("./_helpers");
const F = ["infinitif / infinitive", "présent / present", "prétérit / past", "parfait / perfect", "impératif / imperative"];
const V = (t, gl, lvl, f, o) => formsVerb(F, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le suédois a trois voyelles de plus (å, ä, ö) et une mélodie à deux accents tonals. Les verbes ne changent pas selon la personne.", "Swedish has three extra vowels (å, ä, ö) and a two-tone pitch accent. Verbs don't change with the person."),
  grammar: [
    { id: "sv-genre", level: "A1", icon: "⚥", title: g("en-ord et ett-ord", "en-words and ett-words"), body: g("<p>Deux genres : commun (<b>en</b> bil) et neutre (<b>ett</b> hus). L'article défini est un suffixe : <i>bilen</i> (la voiture), <i>huset</i> (la maison).</p>", "<p>Two genders: common (<b>en</b> bil) and neuter (<b>ett</b> hus). The definite article is a suffix: <i>bilen</i> (the car), <i>huset</i> (the house).</p>"), ex: [ex("Huset är rött.", "", "La maison est rouge.", "The house is red.")] },
    { id: "sv-verbe", level: "A1", icon: "⚡", title: g("Un verbe, une forme", "One verb, one form"), body: g("<p>Au présent, tous les verbes finissent en -r et ne changent pas : <i>jag talar, du talar, vi talar</i>.</p>", "<p>In the present all verbs end in -r and don't change: <i>jag talar, du talar, vi talar</i>.</p>"), ex: [ex("Vi bor i Stockholm.", "", "Nous habitons à Stockholm.", "We live in Stockholm.")] },
    { id: "sv-v2", level: "A1", icon: "2️⃣", title: g("Le verbe en 2e position", "Verb second"), body: g("<p>Le verbe conjugué vient en 2<sup>e</sup> position : <i>Idag <b>arbetar</b> jag hemma</i>.</p>", "<p>The finite verb comes second: <i>Idag <b>arbetar</b> jag hemma</i> (Today I work at home).</p>"), ex: [ex("På lördag åker vi till Göteborg.", "", "Samedi nous allons à Göteborg.", "On Saturday we're going to Gothenburg.")] },
    { id: "sv-inte", level: "A1", icon: "🚫", title: g("La négation « inte »", "Negation 'inte'"), body: g("<p><b>inte</b> suit le verbe : <i>Jag förstår inte</i>. Dans la subordonnée, il le précède : <i>…att jag inte förstår</i>.</p>", "<p><b>inte</b> follows the verb: <i>Jag förstår inte</i>. In subordinate clauses it precedes it: <i>…att jag inte förstår</i>.</p>"), ex: [ex("Jag dricker inte kaffe.", "", "Je ne bois pas de café.", "I don't drink coffee.")] },
    { id: "sv-adj", level: "A2", icon: "🎨", title: g("L'accord de l'adjectif", "Adjective agreement"), body: g("<p><i>en stor bil, ett stort hus, stora bilar</i> ; forme définie : <i>den stora bilen</i>.</p>", "<p><i>en stor bil, ett stort hus, stora bilar</i>; definite form: <i>den stora bilen</i>.</p>"), ex: [ex("Det gamla huset är vackert.", "", "La vieille maison est belle.", "The old house is beautiful.")] },
  ],
  conj: {
    tenses: [{ id: "formes", fr: "Formes principales", en: "Main forms" }],
    verbs: [
      V("vara", g("être", "to be"), "A1", ["att vara", "är", "var", "har varit", "var!"], { irregular: true }),
      V("ha", g("avoir", "to have"), "A1", ["att ha", "har", "hade", "har haft", "ha!"], { irregular: true }),
      V("tala", g("parler", "to speak"), "A1", ["att tala", "talar", "talade", "har talat", "tala!"]),
      V("gå", g("aller (à pied)", "to go (walk)"), "A1", ["att gå", "går", "gick", "har gått", "gå!"], { irregular: true }),
      V("äta", g("manger", "to eat"), "A1", ["att äta", "äter", "åt", "har ätit", "ät!"], { irregular: true }),
      V("komma", g("venir", "to come"), "A1", ["att komma", "kommer", "kom", "har kommit", "kom!"], { irregular: true }),
    ],
  },
  readings: [
    { id: "sv-r1", level: "A1", title: "Fika", t: "Jag heter Erik och jag bor i Uppsala. Varje dag klockan tre tar vi fika på jobbet. Vi dricker kaffe och äter kanelbullar. Det är en paus för att prata med kollegorna.", tr: g("Je m'appelle Erik et j'habite à Uppsala. Tous les jours à trois heures, nous faisons une fika au travail. Nous buvons du café et mangeons des brioches à la cannelle. C'est une pause pour discuter avec les collègues.", "My name is Erik and I live in Uppsala. Every day at three we have fika at work. We drink coffee and eat cinnamon buns. It's a break to chat with colleagues."),
      q: [q("Que mange-t-on pendant la fika ?", "What do they eat during fika?", [["Des brioches à la cannelle", "Cinnamon buns"], ["Du poisson", "Fish"], ["Une soupe", "Soup"]], 0)] },
    { id: "sv-r2", level: "A2", title: "Midsommar", t: "Midsommar firas i juni när dagarna är som längst. Man klär en midsommarstång med blommor och dansar runt den. Sedan äter man sill, färskpotatis och jordgubbar. Många unga plockar sju sorters blommor och lägger dem under kudden.", tr: g("La Saint-Jean se fête en juin, quand les jours sont les plus longs. On décore un mât de fleurs et on danse autour. Puis on mange du hareng, des pommes de terre nouvelles et des fraises. Beaucoup de jeunes cueillent sept sortes de fleurs et les mettent sous leur oreiller.", "Midsummer is celebrated in June when days are longest. People decorate a maypole with flowers and dance around it. Then they eat herring, new potatoes and strawberries. Many young people pick seven kinds of flowers and put them under their pillow."),
      q: [q("Combien de sortes de fleurs cueille-t-on ?", "How many kinds of flowers are picked?", [["Sept", "Seven"], ["Trois", "Three"], ["Dix", "Ten"]], 0)] },
  ],
  culture: [
    { id: "sv-c1", level: "A1", icon: "☕", title: g("La fika", "Fika"), body: g("<p>Pause café-gâteau sacrée, au travail comme en famille.</p>", "<p>A sacred coffee-and-cake break, at work and at home.</p>") },
    { id: "sv-c2", level: "A2", icon: "⚖️", title: g("Lagom", "Lagom"), body: g("<p>« Ni trop, ni trop peu » : la juste mesure, valeur clé de la société suédoise.</p>", "<p>'Not too much, not too little': just the right amount, a key Swedish value.</p>") },
    { id: "sv-c3", level: "B1", icon: "🌲", title: g("Allemansrätten", "Allemansrätten"), body: g("<p>Le droit d'accès à la nature permet à chacun de marcher, camper une nuit et cueillir des baies presque partout, en respectant les lieux.</p>", "<p>The right of public access lets everyone walk, camp for a night and pick berries almost anywhere, as long as they respect the land.</p>") },
  ],
};
