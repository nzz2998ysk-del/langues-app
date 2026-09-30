const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["minä", "sinä", "hän", "me", "te", "he"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le finnois se lit comme il s'écrit ; l'accent tombe toujours sur la première syllabe. Voyelles et consonnes doubles sont longues : tuli (feu) ≠ tuuli (vent).", "Finnish is read as written; stress always falls on the first syllable. Double vowels and consonants are long: tuli (fire) ≠ tuuli (wind)."),
  grammar: [
    G("fi-genre", "A1", "🚫", ["Ni genre ni article", "No gender, no articles"], ["<p>Un seul pronom <b>hän</b> pour « il » et « elle ». Pas d'articles : <i>talo</i> = une maison / la maison.</p>", "<p>One pronoun <b>hän</b> for 'he' and 'she'. No articles: <i>talo</i> = a house / the house.</p>"], [ex("Hän on opettaja.", "", "Il / Elle est enseignant(e).", "He / She is a teacher.")]),
    G("fi-cas", "A1", "🧩", ["Quinze cas", "Fifteen cases"], ["<p>Les prépositions sont remplacées par des terminaisons : <i>talo<b>ssa</b></i> (dans la maison), <i>talo<b>on</b></i> (vers la maison), <i>talo<b>sta</b></i> (de la maison), <i>pöydä<b>llä</b></i> (sur la table).</p>", "<p>Endings replace prepositions: <i>talo<b>ssa</b></i> (in the house), <i>talo<b>on</b></i> (into the house), <i>talo<b>sta</b></i> (out of the house), <i>pöydä<b>llä</b></i> (on the table).</p>"], [ex("Asun Helsingissä.", "", "J'habite à Helsinki.", "I live in Helsinki.")]),
    G("fi-harmonie", "A1", "🎼", ["L'harmonie vocalique", "Vowel harmony"], ["<p>Un mot ne mélange pas a, o, u avec ä, ö, y : les terminaisons s'adaptent (<i>talossa</i> mais <i>kylässä</i>).</p>", "<p>A word doesn't mix a, o, u with ä, ö, y: endings adapt (<i>talossa</i> but <i>kylässä</i>).</p>"], [ex("Olen kaupassa ja sinä olet kylässä.", "", "Je suis au magasin et tu es au village.", "I'm at the shop and you're in the village.")]),
    G("fi-negation", "A1", "🚫", ["Le verbe de négation", "The negative verb"], ["<p>La négation est un verbe conjugué : <i>en, et, ei, emme, ette, eivät</i> + radical : <i>En puhu</i> (je ne parle pas).</p>", "<p>Negation is a conjugated verb: <i>en, et, ei, emme, ette, eivät</i> + stem: <i>En puhu</i> (I don't speak).</p>"], [ex("En ymmärrä.", "", "Je ne comprends pas.", "I don't understand.")]),
    G("fi-avoir", "A2", "🔑", ["« Avoir » sans verbe avoir", "'Have' without a verb 'have'"], ["<p>On dit « chez moi est » : <i>Minulla on koira</i> (j'ai un chien).</p>", "<p>You say 'at me is': <i>Minulla on koira</i> (I have a dog).</p>"], [ex("Onko sinulla aikaa?", "", "As-tu le temps ?", "Do you have time?")]),
    G("fi-partitif", "B1", "🍰", ["Le partitif", "The partitive"], ["<p>Pour une quantité indéterminée, après les nombres et dans la négation : <i>Juon kahvia</i> (je bois du café), <i>kaksi kahvia</i>, <i>Minulla ei ole autoa</i>.</p>", "<p>For indefinite amounts, after numbers and in negation: <i>Juon kahvia</i> (I drink coffee), <i>kaksi kahvia</i>, <i>Minulla ei ole autoa</i> (I have no car).</p>"], [ex("Haluan vettä.", "", "Je veux de l'eau.", "I want some water.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }, { id: "imperfekti", fr: "Passé (imperfekti)", en: "Past (imperfect)" }],
    verbs: [
      V("olla", g("être", "to be"), "A1", { present: ["olen", "olet", "on", "olemme", "olette", "ovat"], imperfekti: ["olin", "olit", "oli", "olimme", "olitte", "olivat"] }, { irregular: true }),
      V("puhua", g("parler", "to speak"), "A1", { present: ["puhun", "puhut", "puhuu", "puhumme", "puhutte", "puhuvat"], imperfekti: ["puhuin", "puhuit", "puhui", "puhuimme", "puhuitte", "puhuivat"] }),
      V("syödä", g("manger", "to eat"), "A1", { present: ["syön", "syöt", "syö", "syömme", "syötte", "syövät"], imperfekti: ["söin", "söit", "söi", "söimme", "söitte", "söivät"] }),
      V("mennä", g("aller", "to go"), "A1", { present: ["menen", "menet", "menee", "menemme", "menette", "menevät"], imperfekti: ["menin", "menit", "meni", "menimme", "menitte", "menivät"] }),
      V("asua", g("habiter", "to live"), "A1", { present: ["asun", "asut", "asuu", "asumme", "asutte", "asuvat"], imperfekti: ["asuin", "asuit", "asui", "asuimme", "asuitte", "asuivat"] }),
    ],
  },
  readings: [
    R("fi-r1", "A1", "Sauna", "Minä olen Aino ja asun Tampereella. Joka lauantai menen saunaan perheen kanssa. Saunan jälkeen uimme järvessä, myös talvella! Sitten juomme kahvia ja syömme pullaa.", "", ["Je m'appelle Aino et j'habite à Tampere. Tous les samedis, je vais au sauna avec ma famille. Après le sauna, nous nageons dans le lac, même en hiver ! Ensuite nous buvons du café et mangeons des brioches.", "I'm Aino and I live in Tampere. Every Saturday I go to the sauna with my family. After the sauna we swim in the lake, even in winter! Then we drink coffee and eat sweet buns."],
      [q("Que fait-on après le sauna ?", "What do they do after the sauna?", [["On nage dans le lac", "Swim in the lake"], ["On dort", "Sleep"], ["On court", "Go running"]], 0)]),
    R("fi-r2", "A2", "Revontulet", "Lapissa voi nähdä revontulia syksyllä ja talvella. Taivas on vihreä, joskus myös punainen tai violetti. Vanhan tarinan mukaan tulikettu juoksi tuntureilla ja sen häntä nosti lumen taivaalle.", "", ["En Laponie, on peut voir des aurores boréales en automne et en hiver. Le ciel est vert, parfois rouge ou violet. Selon une vieille légende, un renard de feu courait sur les collines et sa queue soulevait la neige vers le ciel.", "In Lapland you can see the northern lights in autumn and winter. The sky turns green, sometimes red or purple. According to an old tale, a fire fox ran across the fells and its tail swept snow into the sky."],
      [q("Selon la légende, qui crée les aurores ?", "According to the legend, who makes the lights?", [["Un renard de feu", "A fire fox"], ["Un ours", "A bear"], ["Un dragon", "A dragon"]], 0)]),
  ],
  culture: [
    C("fi-c1", "A1", "🧖", ["Le sauna", "The sauna"], ["<p>Environ trois millions de saunas pour cinq millions et demi d'habitants. Le sauna finlandais est inscrit au patrimoine de l'UNESCO.</p>", "<p>About three million saunas for five and a half million people. Finnish sauna culture is on UNESCO's heritage list.</p>"]),
    C("fi-c2", "A2", "🤫", ["Le silence", "Silence"], ["<p>Le silence n'est pas gênant en Finlande : on parle quand on a quelque chose à dire.</p>", "<p>Silence isn't awkward in Finland: people speak when they have something to say.</p>"]),
    C("fi-c3", "B1", "💪", ["Sisu", "Sisu"], ["<p>Courage, ténacité face à l'adversité : une valeur au cœur de l'identité finlandaise.</p>", "<p>Grit and perseverance against adversity: a value at the heart of Finnish identity.</p>"]),
  ],
};
