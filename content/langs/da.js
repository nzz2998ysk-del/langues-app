const { g, ex, q, formsVerb } = require("./_helpers");
const F = ["infinitif / infinitive", "présent / present", "prétérit / past", "parfait / perfect", "impératif / imperative"];
const V = (t, gl, lvl, f, o) => formsVerb(F, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le danois s'écrit presque comme le norvégien, mais se prononce très différemment : consonnes adoucies, « stød » (coup de glotte). Écoutez beaucoup !", "Danish is written much like Norwegian but sounds very different: softened consonants and the 'stød' (glottal catch). Listen a lot!"),
  grammar: [
    { id: "da-genre", level: "A1", icon: "⚥", title: g("en et et", "en and et"), body: g("<p>Commun : <i>en bil → bilen</i>. Neutre : <i>et hus → huset</i>. L'article défini est un suffixe.</p>", "<p>Common: <i>en bil → bilen</i>. Neuter: <i>et hus → huset</i>. The definite article is a suffix.</p>"), ex: [ex("Bilen er ny.", "", "La voiture est neuve.", "The car is new.")] },
    { id: "da-verbe", level: "A1", icon: "⚡", title: g("Verbes invariables", "Invariable verbs"), body: g("<p>Présent en -r pour toutes les personnes : <i>jeg taler, du taler, vi taler</i>.</p>", "<p>Present in -r for all persons: <i>jeg taler, du taler, vi taler</i>.</p>"), ex: [ex("Taler du dansk?", "", "Parles-tu danois ?", "Do you speak Danish?")] },
    { id: "da-v2", level: "A1", icon: "2️⃣", title: g("Verbe en 2e position, négation « ikke »", "Verb second, negation 'ikke'"), body: g("<p><i>I dag <b>arbejder</b> jeg hjemme.</i> <i>Jeg forstår <b>ikke</b>.</i></p>", "<p><i>I dag <b>arbejder</b> jeg hjemme.</i> <i>Jeg forstår <b>ikke</b>.</i></p>"), ex: [ex("I morgen cykler vi til stranden.", "", "Demain nous allons à la plage à vélo.", "Tomorrow we're cycling to the beach.")] },
    { id: "da-adj", level: "A2", icon: "🎨", title: g("Adjectif et forme définie", "Adjectives and definite form"), body: g("<p><i>en stor bil, et stort hus, store biler</i> ; définie : <i>den store bil</i> (pas de suffixe en danois dans ce cas).</p>", "<p><i>en stor bil, et stort hus, store biler</i>; definite: <i>den store bil</i> (no suffix in Danish in this case).</p>"), ex: [ex("Det gamle hus ligger ved havet.", "", "La vieille maison est au bord de la mer.", "The old house is by the sea.")] },
    { id: "da-tal", level: "B1", icon: "🔢", title: g("Les nombres vicésimaux", "Vigesimal numbers"), body: g("<p>Les dizaines de 50 à 90 comptent par vingtaines : <i>halvtreds</i> (50), <i>tres</i> (60), <i>halvfjerds</i> (70), <i>firs</i> (80), <i>halvfems</i> (90). Et l'unité se dit avant : <i>enogtyve</i> (21).</p>", "<p>Tens from 50 to 90 count in twenties: <i>halvtreds</i> (50), <i>tres</i> (60), <i>halvfjerds</i> (70), <i>firs</i> (80), <i>halvfems</i> (90). Units come first: <i>enogtyve</i> (21).</p>"), ex: [ex("Jeg er toogtredive år.", "", "J'ai trente-deux ans.", "I'm thirty-two.")] },
  ],
  conj: {
    tenses: [{ id: "formes", fr: "Formes principales", en: "Main forms" }],
    verbs: [
      V("være", g("être", "to be"), "A1", ["at være", "er", "var", "har været", "vær!"], { irregular: true }),
      V("have", g("avoir", "to have"), "A1", ["at have", "har", "havde", "har haft", "hav!"], { irregular: true }),
      V("tale", g("parler", "to speak"), "A1", ["at tale", "taler", "talte", "har talt", "tal!"]),
      V("gå", g("aller (à pied)", "to go (walk)"), "A1", ["at gå", "går", "gik", "er gået", "gå!"], { irregular: true }),
      V("spise", g("manger", "to eat"), "A1", ["at spise", "spiser", "spiste", "har spist", "spis!"]),
      V("komme", g("venir", "to come"), "A1", ["at komme", "kommer", "kom", "er kommet", "kom!"], { irregular: true }),
    ],
  },
  readings: [
    { id: "da-r1", level: "A1", title: "Hygge", t: "Jeg hedder Mads og bor i København. Om vinteren er det koldt og mørkt. Så tænder vi stearinlys, drikker te og spiller spil med venner. Det kalder vi hygge.", tr: g("Je m'appelle Mads et j'habite à Copenhague. En hiver, il fait froid et sombre. Alors nous allumons des bougies, buvons du thé et jouons à des jeux avec des amis. C'est ce qu'on appelle le hygge.", "My name is Mads and I live in Copenhagen. In winter it's cold and dark. So we light candles, drink tea and play games with friends. We call that hygge."),
      q: [q("Qu'allume-t-on pour le hygge ?", "What do they light for hygge?", [["Des bougies", "Candles"], ["La télé", "The TV"], ["Un barbecue", "A barbecue"]], 0)] },
    { id: "da-r2", level: "A2", title: "LEGO", t: "LEGO blev opfundet i Danmark af en tømrer fra Billund. Navnet kommer fra \"leg godt\". I dag bliver klodserne solgt i hele verden, og i Billund kan man besøge Legoland.", tr: g("LEGO a été inventé au Danemark par un menuisier de Billund. Le nom vient de « leg godt » (joue bien). Aujourd'hui, les briques sont vendues dans le monde entier et on peut visiter Legoland à Billund.", "LEGO was invented in Denmark by a carpenter from Billund. The name comes from 'leg godt' (play well). Today the bricks are sold all over the world, and you can visit Legoland in Billund."),
      q: [q("D'où vient le nom LEGO ?", "Where does the name LEGO come from?", [["« leg godt », joue bien", "'leg godt', play well"], ["Du latin", "From Latin"], ["D'un prénom", "From a first name"]], 0)] },
  ],
  culture: [
    { id: "da-c1", level: "A1", icon: "🕯️", title: g("Hygge", "Hygge"), body: g("<p>Ambiance chaleureuse et conviviale ; les Danois brûlent plus de bougies que n'importe quel autre peuple européen.</p>", "<p>A cosy, convivial atmosphere; Danes burn more candles than any other Europeans.</p>") },
    { id: "da-c2", level: "A2", icon: "🥪", title: g("Smørrebrød", "Smørrebrød"), body: g("<p>Tartines de pain de seigle garnies (hareng, rôti, œuf, crevettes) qu'on mange avec couteau et fourchette.</p>", "<p>Rye-bread open sandwiches (herring, roast, egg, shrimp) eaten with knife and fork.</p>") },
    { id: "da-c3", level: "B1", icon: "📖", title: g("Andersen", "Andersen"), body: g("<p>Hans Christian Andersen (La Petite Sirène, Le Vilain Petit Canard) est l'écrivain danois le plus traduit.</p>", "<p>Hans Christian Andersen (The Little Mermaid, The Ugly Duckling) is the most translated Danish writer.</p>") },
  ],
};
