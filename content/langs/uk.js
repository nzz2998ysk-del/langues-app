const { g, verb, ex, q } = require("./_helpers");
const P = ["я", "ти", "він / вона", "ми", "ви", "вони"];
const V = (t, r, gl, lvl, f, o) => verb(P, t, gl, lvl, f, Object.assign({ r }, o));
const A = (c, name, sound, t, r, fr, en) => ({ c, final: "", name, sound, ex: { t, r, g: g(fr, en) } });
module.exports = {
  replace: ["grammar", "readings"],
  note: g("L'ukrainien s'écrit en cyrillique, avec des lettres propres (і, ї, є, ґ). Il se prononce presque comme il s'écrit.", "Ukrainian is written in Cyrillic, with its own letters (і, ї, є, ґ). It is pronounced almost as written."),
  alphabetNote: g("33 lettres. Différences avec le russe : и = y (i court), і = i, ї = yi, є = ye, г = h, ґ = g.", "33 letters. Differences from Russian: и = y (short i), і = i, ї = yi, є = ye, г = h, ґ = g."),
  alphabet: [
    A("А а", "a", "a", "мама", "mama", "maman", "mum"), A("Б б", "be", "b", "брат", "brat", "frère", "brother"), A("В в", "ve", "v / w", "вода", "voda", "eau", "water"),
    A("Г г", "he", "h sonore", "гора", "hora", "montagne", "mountain"), A("Ґ ґ", "ge", "g", "ґанок", "ganok", "perron", "porch"), A("Д д", "de", "d", "дім", "dim", "maison", "house"),
    A("Е е", "e", "è", "тепло", "teplo", "chaud", "warm"), A("Є є", "ye", "yè", "Європа", "Yevropa", "Europe", "Europe"), A("Ж ж", "zhe", "j", "жити", "zhyty", "vivre", "to live"),
    A("З з", "ze", "z", "зима", "zyma", "hiver", "winter"), A("И и", "y", "ɪ (i ouvert)", "син", "syn", "fils", "son"), A("І і", "i", "i", "ім'я", "im'ia", "prénom", "first name"),
    A("Ї ї", "yi", "yi", "їжа", "yizha", "nourriture", "food"), A("Й й", "yot", "y", "край", "krai", "pays, bord", "land, edge"), A("К к", "ka", "k", "кіт", "kit", "chat", "cat"),
    A("Л л", "el", "l", "літо", "lito", "été", "summer"), A("М м", "em", "m", "місто", "misto", "ville", "city"), A("Н н", "en", "n", "ніч", "nich", "nuit", "night"),
    A("О о", "o", "o", "око", "oko", "œil", "eye"), A("П п", "pe", "p", "пісня", "pisnia", "chanson", "song"), A("Р р", "er", "r roulé", "рука", "ruka", "main", "hand"),
    A("С с", "es", "s", "сонце", "sontse", "soleil", "sun"), A("Т т", "te", "t", "тато", "tato", "papa", "dad"), A("У у", "u", "ou", "урок", "urok", "leçon", "lesson"),
    A("Ф ф", "ef", "f", "фото", "foto", "photo", "photo"), A("Х х", "kha", "kh", "хліб", "khlib", "pain", "bread"), A("Ц ц", "tse", "ts", "цукор", "tsukor", "sucre", "sugar"),
    A("Ч ч", "che", "tch", "чай", "chai", "thé", "tea"), A("Ш ш", "sha", "ch", "школа", "shkola", "école", "school"), A("Щ щ", "shcha", "chtch", "щастя", "shchastia", "bonheur", "happiness"),
    A("Ь ь", "m'yakyi znak", "(mouillure)", "день", "den'", "jour", "day"), A("Ю ю", "yu", "you", "юнак", "yunak", "jeune homme", "young man"), A("Я я", "ya", "ya", "яблуко", "yabluko", "pomme", "apple"),
  ],
  grammar: [
    { id: "uk-base", level: "A1", icon: "🚫", title: g("Pas d'articles, « être » souvent omis", "No articles, 'to be' often dropped"), body: g("<p><i>Я студент</i> = je suis étudiant. La forme <b>є</b> s'utilise pour « il y a / avoir » : <i>У мене є кіт</i> (j'ai un chat).</p>", "<p><i>Я студент</i> = I am a student. The form <b>є</b> is used for 'there is / to have': <i>У мене є кіт</i> (I have a cat).</p>"), ex: [ex("Це моя сестра.", "Tse moia sestra.", "C'est ma sœur.", "This is my sister.")] },
    { id: "uk-genre", level: "A1", icon: "⚥", title: g("Trois genres", "Three genders"), body: g("<p>Masculin : consonne (<i>дім</i>). Féminin : -а/-я (<i>книга</i>). Neutre : -о/-е (<i>місто</i>).</p>", "<p>Masculine: consonant (<i>дім</i>). Feminine: -а/-я (<i>книга</i>). Neuter: -о/-е (<i>місто</i>).</p>"), ex: [ex("новий дім, нова книга, нове місто", "novyi dim, nova knyha, nove misto", "une nouvelle maison, un nouveau livre, une nouvelle ville", "a new house, a new book, a new city")] },
    { id: "uk-cas", level: "A2", icon: "🧩", title: g("Sept cas, dont le vocatif", "Seven cases, including the vocative"), body: g("<p>En plus des six cas du russe, l'ukrainien garde le <b>vocatif</b> pour interpeller : <i>Олена → Олено!</i>, <i>друг → друже!</i></p>", "<p>Besides the six Russian cases, Ukrainian keeps the <b>vocative</b> for addressing people: <i>Олена → Олено!</i>, <i>друг → друже!</i></p>"), ex: [ex("Дякую, пане Андрію!", "Diakuiu, pane Andriiu!", "Merci, monsieur Andriï !", "Thank you, Mr Andriy!")] },
    { id: "uk-present", level: "A1", icon: "⚡", title: g("Le présent", "Present tense"), body: g("<p>1<sup>re</sup> conjugaison : <i>читаю, читаєш, читає…</i> 2<sup>e</sup> : <i>говорю, говориш, говорить…</i></p>", "<p>1st conjugation: <i>читаю, читаєш, читає…</i> 2nd: <i>говорю, говориш, говорить…</i></p>"), ex: [ex("Ми живемо у Києві.", "My zhyvemo u Kyievi.", "Nous habitons à Kyiv.", "We live in Kyiv.")] },
    { id: "uk-passe", level: "A2", icon: "⏪", title: g("Le passé", "The past"), body: g("<p>Accord en genre et nombre : <i>він читав, вона читала, воно читало, вони читали</i>.</p>", "<p>Agrees in gender and number: <i>він читав, вона читала, воно читало, вони читали</i>.</p>"), ex: [ex("Вчора я читала книгу.", "Vchora ya chytala knyhu.", "Hier j'ai lu un livre (femme).", "Yesterday I read a book (female speaker).")] },
    { id: "uk-futur", level: "B1", icon: "⏩", title: g("Deux futurs imperfectifs", "Two imperfective futures"), body: g("<p><i>буду читати</i> ou forme synthétique <i>читатиму</i> — les deux signifient « je lirai ». Le perfectif conjugué donne le futur accompli : <i>прочитаю</i>.</p>", "<p><i>буду читати</i> or the synthetic <i>читатиму</i> — both mean 'I will read'. The conjugated perfective gives the completed future: <i>прочитаю</i>.</p>"), ex: [ex("Завтра я буду працювати.", "Zavtra ya budu pratsiuvaty.", "Demain je travaillerai.", "Tomorrow I will work.")] },
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }],
    verbs: [
      V("читати", "chytaty", g("lire", "to read"), "A1", { present: [["читаю", "chytaiu"], ["читаєш", "chytaiesh"], ["читає", "chytaie"], ["читаємо", "chytaiemo"], ["читаєте", "chytaiete"], ["читають", "chytaiut"]] }),
      V("говорити", "hovoryty", g("parler", "to speak"), "A1", { present: [["говорю", "hovoriu"], ["говориш", "hovorysh"], ["говорить", "hovoryt'"], ["говоримо", "hovorymo"], ["говорите", "hovoryte"], ["говорять", "hovoriat'"]] }),
      V("жити", "zhyty", g("vivre", "to live"), "A1", { present: [["живу", "zhyvu"], ["живеш", "zhyvesh"], ["живе", "zhyve"], ["живемо", "zhyvemo"], ["живете", "zhyvete"], ["живуть", "zhyvut'"]] }, { irregular: true }),
      V("хотіти", "khotity", g("vouloir", "to want"), "A1", { present: [["хочу", "khochu"], ["хочеш", "khochesh"], ["хоче", "khoche"], ["хочемо", "khochemo"], ["хочете", "khochete"], ["хочуть", "khochut'"]] }, { irregular: true }),
    ],
  },
  readings: [
    { id: "uk-r1", level: "A1", title: "Моє місто", t: "Мене звати Олена. Я живу у Львові. Це дуже гарне місто. Тут багато кав'ярень і старих будинків. Я люблю пити каву з друзями.", r: "Mene zvaty Olena. Ya zhyvu u L'vovi. Tse duzhe harne misto. Tut bahato kav'iaren' i starykh budynkiv. Ya liubliu pyty kavu z druziamy.", tr: g("Je m'appelle Olena. J'habite à Lviv. C'est une très belle ville. Il y a beaucoup de cafés et de vieilles maisons. J'aime boire un café avec mes amis.", "My name is Olena. I live in Lviv. It's a very beautiful city. There are many cafés and old buildings. I like drinking coffee with friends."),
      q: [q("Où habite Olena ?", "Where does Olena live?", [["À Lviv", "In Lviv"], ["À Kyiv", "In Kyiv"], ["À Odessa", "In Odesa"]], 0)] },
    { id: "uk-r2", level: "A2", title: "Борщ", t: "Борщ — найвідоміша українська страва. Його готують з буряка, капусти, картоплі та м'яса. Зазвичай борщ їдять зі сметаною і пампушками з часником. У 2022 році ЮНЕСКО внесла культуру приготування борщу до списку нематеріальної спадщини.", r: "Borshch — naividomisha ukrains'ka strava. Yoho hotuiut' z buriaka, kapusty, kartopli ta m'iasa. Zazvychai borshch yidiat' zi smetanoiu i pampushkamy z chasnykom. U 2022 rotsi YuNESKO vnesla kul'turu pryhotuvannia borshchu do spysku nematerial'noi spadshchyny.", tr: g("Le bortsch est le plat ukrainien le plus connu. On le prépare avec de la betterave, du chou, des pommes de terre et de la viande. On le mange souvent avec de la crème aigre et des petits pains à l'ail. En 2022, l'UNESCO a inscrit la culture du bortsch au patrimoine immatériel.", "Borscht is the best-known Ukrainian dish. It's made with beetroot, cabbage, potatoes and meat. It's usually eaten with sour cream and garlic buns. In 2022 UNESCO added the culture of borscht cooking to its intangible heritage list."),
      q: [q("Avec quoi mange-t-on le bortsch ?", "What is borscht eaten with?", [["Crème aigre et pains à l'ail", "Sour cream and garlic buns"], ["Riz", "Rice"], ["Frites", "Chips"]], 0)] },
  ],
  culture: [
    { id: "uk-c1", level: "A1", icon: "🌻", title: g("Symboles", "Symbols"), body: g("<p>Le drapeau bleu et jaune évoque le ciel au-dessus des champs de blé. Le tournesol est la fleur nationale.</p>", "<p>The blue and yellow flag evokes the sky above wheat fields. The sunflower is the national flower.</p>") },
    { id: "uk-c2", level: "A2", icon: "🧵", title: g("La vychyvanka", "The vyshyvanka"), body: g("<p>Chemise brodée traditionnelle ; chaque région a ses motifs. On la porte fièrement lors de la Journée de la vychyvanka, en mai.</p>", "<p>A traditional embroidered shirt; each region has its patterns. People wear it proudly on Vyshyvanka Day in May.</p>") },
    { id: "uk-c3", level: "B1", icon: "🥚", title: g("Les pyssanky", "Pysanky"), body: g("<p>Œufs de Pâques décorés à la cire et aux teintures, avec des motifs symboliques anciens.</p>", "<p>Easter eggs decorated with wax and dyes in ancient symbolic patterns.</p>") },
  ],
};
