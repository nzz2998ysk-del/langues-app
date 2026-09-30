const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["ben", "sen", "o", "biz", "siz", "onlar"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Le turc s'écrit en alphabet latin depuis 1928 et se lit comme il s'écrit. Lettres propres : ç, ğ, ı (i sans point), ö, ş, ü.", "Turkish has used the Latin alphabet since 1928 and is read as written. Extra letters: ç, ğ, ı (dotless i), ö, ş, ü."),
  grammar: [
    G("tr-harmonie", "A1", "🎼", ["Harmonie vocalique", "Vowel harmony"], ["<p>Les suffixes suivent la dernière voyelle du mot : pluriel <i>-ler/-lar</i> : <i>evler</i> (maisons), <i>kitaplar</i> (livres).</p>", "<p>Suffixes follow the word's last vowel: plural <i>-ler/-lar</i>: <i>evler</i> (houses), <i>kitaplar</i> (books).</p>"], [ex("Çocuklar okulda.", "", "Les enfants sont à l'école.", "The children are at school.")]),
    G("tr-ordre", "A1", "➡️", ["Sujet – objet – verbe", "Subject – object – verb"], ["<p>Le verbe à la fin : <i>Ben çay içiyorum</i> (je bois du thé). Pas de genre ; <b>o</b> = il/elle.</p>", "<p>Verb last: <i>Ben çay içiyorum</i> (I'm drinking tea). No gender; <b>o</b> = he/she/it.</p>"], [ex("Ben İstanbul'da yaşıyorum.", "", "Je vis à Istanbul.", "I live in Istanbul.")]),
    G("tr-cas", "A2", "🧩", ["Les suffixes de cas", "Case suffixes"], ["<p>Locatif <i>-de/-da</i> (à, dans), datif <i>-e/-a</i> (vers), ablatif <i>-den/-dan</i> (de), accusatif <i>-i</i> (objet défini).</p>", "<p>Locative <i>-de/-da</i> (at, in), dative <i>-e/-a</i> (to), ablative <i>-den/-dan</i> (from), accusative <i>-i</i> (definite object).</p>"], [ex("Okula gidiyorum, evden geliyorum.", "", "Je vais à l'école, je viens de la maison.", "I'm going to school, I'm coming from home.")]),
    G("tr-present", "A1", "⚡", ["Le présent en -iyor", "Present continuous -iyor"], ["<p>Radical + <i>-iyor</i> + terminaison personnelle : <i>geliyorum, geliyorsun, geliyor…</i></p>", "<p>Stem + <i>-iyor</i> + personal ending: <i>geliyorum, geliyorsun, geliyor…</i></p>"], [ex("Ne yapıyorsun?", "", "Que fais-tu ?", "What are you doing?")]),
    G("tr-passe", "A2", "⏪", ["Le passé en -di", "Past tense -di"], ["<p><i>-dı/-di/-du/-dü</i> (ou -tı… après consonne sourde) : <i>geldim</i> (je suis venu), <i>gittik</i> (nous sommes allés).</p>", "<p><i>-dı/-di/-du/-dü</i> (or -tı… after voiceless consonants): <i>geldim</i> (I came), <i>gittik</i> (we went).</p>"], [ex("Dün sinemaya gittim.", "", "Hier je suis allé au cinéma.", "Yesterday I went to the cinema.")]),
    G("tr-var", "A1", "🔑", ["var / yok", "var / yok"], ["<p><b>var</b> = il y a, <b>yok</b> = il n'y a pas. Avoir : <i>Benim bir kedim var</i> (j'ai un chat).</p>", "<p><b>var</b> = there is, <b>yok</b> = there isn't. Having: <i>Benim bir kedim var</i> (I have a cat).</p>"], [ex("Su var mı?", "", "Y a-t-il de l'eau ?", "Is there any water?")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent continu", en: "Present continuous" }, { id: "passe", fr: "Passé", en: "Past" }],
    verbs: [
      V("gelmek", g("venir", "to come"), "A1", { present: ["geliyorum", "geliyorsun", "geliyor", "geliyoruz", "geliyorsunuz", "geliyorlar"], passe: ["geldim", "geldin", "geldi", "geldik", "geldiniz", "geldiler"] }),
      V("gitmek", g("aller", "to go"), "A1", { present: ["gidiyorum", "gidiyorsun", "gidiyor", "gidiyoruz", "gidiyorsunuz", "gidiyorlar"], passe: ["gittim", "gittin", "gitti", "gittik", "gittiniz", "gittiler"] }),
      V("yapmak", g("faire", "to do"), "A1", { present: ["yapıyorum", "yapıyorsun", "yapıyor", "yapıyoruz", "yapıyorsunuz", "yapıyorlar"], passe: ["yaptım", "yaptın", "yaptı", "yaptık", "yaptınız", "yaptılar"] }),
      V("içmek", g("boire", "to drink"), "A1", { present: ["içiyorum", "içiyorsun", "içiyor", "içiyoruz", "içiyorsunuz", "içiyorlar"], passe: ["içtim", "içtin", "içti", "içtik", "içtiniz", "içtiler"] }),
      V("konuşmak", g("parler", "to speak"), "A1", { present: ["konuşuyorum", "konuşuyorsun", "konuşuyor", "konuşuyoruz", "konuşuyorsunuz", "konuşuyorlar"], passe: ["konuştum", "konuştun", "konuştu", "konuştuk", "konuştunuz", "konuştular"] }),
    ],
  },
  readings: [
    R("tr-r1", "A1", "Kahvaltı", "Benim adım Elif. İzmir'de yaşıyorum. Pazar sabahı ailemle büyük bir kahvaltı yapıyoruz. Masada peynir, zeytin, domates, yumurta ve simit var. Tabii ki çok çay içiyoruz!", "", ["Je m'appelle Elif. J'habite à Izmir. Le dimanche matin, nous prenons un grand petit-déjeuner en famille. Sur la table, il y a du fromage, des olives, des tomates, des œufs et des simit. Bien sûr, nous buvons beaucoup de thé !", "My name is Elif. I live in Izmir. On Sunday mornings we have a big breakfast with my family. On the table there's cheese, olives, tomatoes, eggs and simit. Of course we drink lots of tea!"],
      [q("Que boivent-ils ?", "What do they drink?", [["Du thé", "Tea"], ["Du café", "Coffee"], ["Du jus d'orange", "Orange juice"]], 0)]),
    R("tr-r2", "A2", "İstanbul", "İstanbul iki kıtada kurulmuş bir şehirdir: Avrupa ve Asya. Boğaz'ı vapurla geçmek çok güzel. Geçen yaz Ayasofya'yı ve Kapalıçarşı'yı gezdik. Akşam balık ekmek yedik.", "", ["Istanbul est une ville bâtie sur deux continents : l'Europe et l'Asie. Traverser le Bosphore en ferry est magnifique. L'été dernier, nous avons visité Sainte-Sophie et le Grand Bazar. Le soir, nous avons mangé un sandwich au poisson.", "Istanbul is a city built on two continents: Europe and Asia. Crossing the Bosphorus by ferry is beautiful. Last summer we visited Hagia Sophia and the Grand Bazaar. In the evening we ate a fish sandwich."],
      [q("Sur combien de continents est Istanbul ?", "How many continents is Istanbul on?", [["Deux", "Two"], ["Un", "One"], ["Trois", "Three"]], 0)]),
  ],
  culture: [
    C("tr-c1", "A1", "🫖", ["Le thé (çay)", "Tea (çay)"], ["<p>Servi dans de petits verres en forme de tulipe, à toute heure ; refuser un thé offert peut sembler impoli.</p>", "<p>Served in small tulip-shaped glasses at any hour; turning down offered tea can seem rude.</p>"]),
    C("tr-c2", "A2", "🧿", ["Le nazar", "The nazar"], ["<p>L'œil bleu protège du mauvais œil ; on le trouve dans les maisons, les voitures et sur les bébés.</p>", "<p>The blue eye protects against the evil eye; it's found in homes, cars and pinned on babies.</p>"]),
    C("tr-c3", "B1", "🔤", ["La réforme de l'alphabet", "The alphabet reform"], ["<p>En 1928, Atatürk remplace l'alphabet arabe par l'alphabet latin, adapté à la phonologie turque.</p>", "<p>In 1928 Atatürk replaced the Arabic script with a Latin alphabet adapted to Turkish sounds.</p>"]),
  ],
};
