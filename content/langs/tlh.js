const { g, ex, G, R, C } = require("./_helpers");
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Klingon (tlhIngan Hol), créé par Marc Okrand pour Star Trek. Les majuscules et minuscules représentent des sons différents (q ≠ Q). L'audio utilise une voix anglaise approchante.", "Klingon (tlhIngan Hol), created by Marc Okrand for Star Trek. Upper and lower case mark different sounds (q ≠ Q). Audio uses a close English voice."),
  grammar: [
    G("tlh-ovs", "A1", "↩️", ["Objet – verbe – sujet", "Object – verb – subject"], ["<p>Un ordre très rare : l'objet d'abord, puis le verbe, puis le sujet.</p>", "<p>A very rare order: object first, then verb, then subject.</p>"], [ex("Qapla'!", "", "Succès !", "Success!")]),
    G("tlh-casse", "A1", "🔠", ["La casse compte", "Case matters"], ["<p><b>q</b> (k profond) et <b>Q</b> (q + kh) sont deux sons différents ; <b>'</b> est un coup de glotte.</p>", "<p><b>q</b> (deep k) and <b>Q</b> (q + kh) are different sounds; <b>'</b> is a glottal stop.</p>"], [ex("nuqneH?", "", "Que veux-tu ? (salutation)", "What do you want? (greeting)")]),
    G("tlh-suffixes", "A2", "🧩", ["Préfixes et suffixes", "Prefixes and suffixes"], ["<p>Le verbe porte des préfixes de personne et de nombreux suffixes (négation, aspect, certitude…).</p>", "<p>Verbs carry person prefixes and many suffixes (negation, aspect, certainty…).</p>"]),
  ],
  readings: [R("tlh-r1", "A1", "Qapla'", "Qapla'! nuqneH?", "", ["« Succès ! Que veux-tu ? » — salutation typique entre Klingons.", "'Success! What do you want?' — a typical Klingon greeting."])],
  culture: [
    C("tlh-c1", "A1", "🖖", ["Star Trek", "Star Trek"], ["<p>Le klingon, développé à partir de 1984, possède un dictionnaire, des traductions (Hamlet) et un institut de langue.</p>", "<p>Developed from 1984, Klingon has a dictionary, translations (Hamlet) and a language institute.</p>"]),
    C("tlh-c2", "A2", "⚔️", ["Honneur", "Honour"], ["<p>Le lexique reflète une culture guerrière : on dit « Qapla' » (succès) plutôt que « au revoir ».</p>", "<p>The vocabulary reflects a warrior culture: people say 'Qapla'' (success) rather than 'goodbye'.</p>"]),
  ],
};
