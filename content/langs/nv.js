const { g, ex, G, R, C } = require("./_helpers");
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Navajo (Diné bizaad). Langue tonale et polysynthétique ; contenu volontairement limité à des formes vérifiées. Aucune voix navajo n'existe : l'audio est approximatif.", "Navajo (Diné bizaad). A tonal, polysynthetic language; content is deliberately limited to verified forms. No Navajo voice exists: audio is approximate."),
  grammar: [
    G("nv-sov", "A1", "➡️", ["Verbe en fin de phrase", "Verb last"], ["<p>Ordre sujet – objet – verbe, avec une morphologie verbale très riche.</p>", "<p>Subject – object – verb order, with very rich verb morphology.</p>"], [ex("Yáʼátʼééh!", "", "Bonjour !", "Hello!")]),
    G("nv-tons", "A1", "🎵", ["Des tons", "Tones"], ["<p>L'accent aigu marque un ton haut ; l'ogonek (ą) une voyelle nasale ; la barre (ł) un l sourd.</p>", "<p>The acute accent marks high tone; the ogonek (ą) a nasal vowel; the barred ł a voiceless l.</p>"]),
    G("nv-poly", "A2", "🧩", ["Polysynthétique", "Polysynthetic"], ["<p>Un seul mot-verbe peut exprimer une phrase entière.</p>", "<p>A single verb word can express a whole sentence.</p>"]),
  ],
  readings: [R("nv-r1", "A1", "Yáʼátʼééh", "Yáʼátʼééh! Ahéheeʼ.", "", ["« Bonjour ! Merci. »", "'Hello! Thank you.'"])],
  culture: [
    C("nv-c1", "A1", "🏜️", ["La nation navajo", "The Navajo Nation"], ["<p>Le plus grand territoire amérindien des États-Unis, entre l'Arizona, le Nouveau-Mexique et l'Utah.</p>", "<p>The largest Native American territory in the US, spanning Arizona, New Mexico and Utah.</p>"]),
    C("nv-c2", "B1", "📻", ["Les Code Talkers", "The Code Talkers"], ["<p>Pendant la Seconde Guerre mondiale, des soldats navajos transmettaient des messages codés dans leur langue, jamais déchiffrés.</p>", "<p>In World War II, Navajo soldiers passed coded messages in their language that were never broken.</p>"]),
  ],
};
