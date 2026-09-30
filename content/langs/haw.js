const { g, ex, q, G, R, C } = require("./_helpers");
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Hawaïen (ʻŌlelo Hawaiʻi). Aucune voix de synthèse hawaïenne n'existe : l'audio utilise une voix approchante. Le ʻokina (ʻ) est un coup de glotte, le kahakō (ā) allonge la voyelle.", "Hawaiian (ʻŌlelo Hawaiʻi). No Hawaiian speech voice exists: audio uses a close voice. The ʻokina (ʻ) is a glottal stop; the kahakō (ā) lengthens the vowel."),
  grammar: [
    G("haw-alphabet", "A1", "🔤", ["Treize lettres", "Thirteen letters"], ["<p>5 voyelles (a e i o u), 8 consonnes (h k l m n p w ʻ). Toute syllabe finit par une voyelle.</p>", "<p>5 vowels (a e i o u), 8 consonants (h k l m n p w ʻ). Every syllable ends in a vowel.</p>"], [ex("Aloha kakahiaka!", "", "Bonjour (le matin) !", "Good morning!")]),
    G("haw-okina", "A1", "✋", ["ʻOkina et kahakō", "ʻOkina and kahakō"], ["<p>Ils changent le sens : <i>pau</i> (fini) ≠ <i>paʻu</i> (suie) ; <i>kala</i> (argent) ≠ <i>kālā</i> selon le contexte. Ne les omettez pas.</p>", "<p>They change meaning: <i>pau</i> (finished) ≠ <i>paʻu</i> (soot). Don't leave them out.</p>"], [ex("Mahalo nui loa.", "", "Merci beaucoup.", "Thank you very much.")]),
    G("haw-vso", "A1", "➡️", ["Verbe en tête", "Verb first"], ["<p>L'ordre de base est verbe – sujet – objet. Les phrases d'identité commencent par <b>ʻO</b> : <i>ʻO Kai koʻu inoa</i> (Kai est mon nom).</p>", "<p>Basic order is verb – subject – object. Identity sentences start with <b>ʻO</b>: <i>ʻO Kai koʻu inoa</i> (Kai is my name).</p>"], [ex("Pehea ʻoe? — Maikaʻi au.", "", "Comment vas-tu ? — Je vais bien.", "How are you? — I'm fine.")]),
  ],
  readings: [
    R("haw-r1", "A1", "ʻO wai kou inoa?", "ʻO Kai koʻu inoa. Noho au ma Honolulu.", "", ["Je m'appelle Kai. J'habite à Honolulu.", "My name is Kai. I live in Honolulu."],
      [q("Où habite Kai ?", "Where does Kai live?", [["À Honolulu", "In Honolulu"], ["À Tokyo", "In Tokyo"], ["À Paris", "In Paris"]], 0)]),
  ],
  culture: [
    C("haw-c1", "A1", "🌺", ["Aloha", "Aloha"], ["<p>Bien plus qu'un « bonjour » : amour, compassion, respect. L'« esprit aloha » est inscrit dans la loi de l'État d'Hawaï.</p>", "<p>Much more than 'hello': love, compassion, respect. The 'Aloha Spirit' is written into Hawaiʻi state law.</p>"]),
    C("haw-c2", "A2", "💃", ["Le hula", "Hula"], ["<p>Danse qui raconte des histoires, accompagnée de chants (<i>mele</i>) et de percussions.</p>", "<p>A dance that tells stories, accompanied by chant (<i>mele</i>) and percussion.</p>"]),
    C("haw-c3", "B1", "🌱", ["La renaissance", "The revival"], ["<p>Interdit à l'école en 1896, le hawaïen renaît depuis les années 1980 grâce aux écoles d'immersion <i>Pūnana Leo</i>.</p>", "<p>Banned from schools in 1896, Hawaiian has been reviving since the 1980s through <i>Pūnana Leo</i> immersion schools.</p>"]),
  ],
};
