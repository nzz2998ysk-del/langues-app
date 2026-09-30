// Starter-pack content for the 30 additional languages requested on top of the
// original 9. Deliberately lighter than lang-data.js's 5-language "v1" module
// (which has 8 vocab themes x 10 words, 6 grammar points, 4 reading passages):
// here each language gets 3 vocab themes (~22 words), 3 grammar notes and a
// single short reading passage. This is an honest "starter" tier, consistent
// with the new access model (every language is free at a basic level; premium
// unlocks deeper feedback/lessons/exercises later). Best-effort translations;
// a few very-low-resource / constructed languages (Haut Valyrien, Klingon,
// Navajo, Zoulou, Hawaïen, Gaélique écossais...) have a smaller, more
// conservative vocabulary set because reliable material is scarcer.

function v(rows) { return rows; } // [native, pron, fr]

module.exports = {
  fr: { name: "Français", flag: "🇫🇷", color: "#2E4A9E",
    scriptNote: "Le français s'écrit avec l'alphabet latin et des accents (é, è, ê, ç).",
    vocab: {
      "Salutations": v([["Bonjour","","bonjour"],["Merci","","merci"],["S'il te plaît","","s'il te plaît"],["Oui","","oui"],["Non","","non"],["Au revoir","","au revoir"]]),
      "Nombres": v([["un","","1"],["deux","","2"],["trois","","3"],["quatre","","4"],["cinq","","5"],["six","","6"],["sept","","7"],["huit","","8"],["neuf","","9"],["dix","","10"]]),
      "Couleurs": v([["rouge","","rouge"],["bleu","","bleu"],["vert","","vert"],["jaune","","jaune"],["noir","","noir"],["blanc","","blanc"]])
    },
    grammar: [
      ["Genre des noms","Chaque nom est masculin ou féminin (le/la) ; les adjectifs s'accordent en genre et en nombre."],
      ["Ordre des mots","Sujet-Verbe-Objet, comme en anglais : « Je mange une pomme »."],
      ["Conjugaison","Les verbes changent de forme selon la personne et le temps (je parle, tu parles, il parle...)."]
    ],
    reading: [["Bonjour, je m'appelle Léa. J'habite à Lyon et j'aime la lecture.","Traduction : « Hello, my name is Léa. I live in Lyon and I like reading. »"]]
  },
  hi: { name: "हिन्दी (Hindi)", flag: "🇮🇳", color: "#C2622A",
    scriptNote: "Le hindi s'écrit en devanagari, de gauche à droite.",
    vocab: {
      "Salutations": v([["नमस्ते","namaste","bonjour"],["धन्यवाद","dhanyavād","merci"],["कृपया","kṛpayā","s'il te plaît"],["हाँ","hā̃","oui"],["नहीं","nahī̃","non"],["अलविदा","alvidā","au revoir"]]),
      "Nombres": v([["एक","ek","1"],["दो","do","2"],["तीन","tīn","3"],["चार","cār","4"],["पांच","pā̃c","5"],["छह","chah","6"],["सात","sāt","7"],["आठ","āṭh","8"],["नौ","nau","9"],["दस","das","10"]]),
      "Couleurs": v([["लाल","lāl","rouge"],["नीला","nīlā","bleu"],["हरा","harā","vert"],["पीला","pīlā","jaune"],["काला","kālā","noir"],["सफेद","safed","blanc"]])
    },
    grammar: [
      ["Ordre des mots","Le hindi suit l'ordre Sujet-Objet-Verbe : « मैं चाय पीता हूँ » (je thé bois)."],
      ["Postpositions","Au lieu de prépositions avant le nom, le hindi utilise des postpositions après : घर में (dans la maison)."],
      ["Genre grammatical","Les noms et adjectifs sont masculins ou féminins, ce qui change la forme du verbe."]
    ],
    reading: [["मेरा नाम राज है। मैं दिल्ली में रहता हूँ।","Traduction : « Je m'appelle Raj. J'habite à Delhi. »"]]
  },
  ko: { name: "한국어 (Coréen)", flag: "🇰🇷", color: "#4152B3",
    scriptNote: "Le coréen s'écrit en hangeul, un alphabet phonétique organisé en blocs de syllabes.",
    vocab: {
      "Salutations": v([["안녕하세요","annyeonghaseyo","bonjour"],["감사합니다","gamsahamnida","merci"],["부탁합니다","butakhamnida","s'il te plaît"],["네","ne","oui"],["아니요","aniyo","non"],["안녕히 가세요","annyeonghi gaseyo","au revoir"]]),
      "Nombres": v([["일","il","1"],["이","i","2"],["삼","sam","3"],["사","sa","4"],["오","o","5"],["육","yuk","6"],["칠","chil","7"],["팔","pal","8"],["구","gu","9"],["십","sip","10"]]),
      "Couleurs": v([["빨간색","ppalgansaek","rouge"],["파란색","paransaek","bleu"],["초록색","choroksaek","vert"],["노란색","noransaek","jaune"],["검은색","geomeunsaek","noir"],["흰색","huinsaek","blanc"]])
    },
    grammar: [
      ["Ordre des mots","Le coréen suit l'ordre Sujet-Objet-Verbe, le verbe vient toujours en dernier."],
      ["Particules","De petites particules collées aux mots indiquent leur rôle (sujet, objet, thème) : 저는, 밥을..."],
      ["Niveaux de politesse","Le coréen a plusieurs registres de politesse selon la personne à qui l'on parle."]
    ],
    reading: [["제 이름은 민수입니다. 저는 서울에 삽니다.","Traduction : « Je m'appelle Minsu. J'habite à Séoul. »"]]
  },
  ar: { name: "العربية (Arabe)", flag: "🇸🇦", color: "#2E7D5B",
    scriptNote: "L'arabe s'écrit de droite à gauche, avec des lettres qui changent de forme selon leur position dans le mot.",
    vocab: {
      "Salutations": v([["مرحبا","marhaba","bonjour"],["شكرا","shukran","merci"],["من فضلك","min fadlik","s'il te plaît"],["نعم","na'am","oui"],["لا","lā","non"],["مع السلامة","ma'a salāma","au revoir"]]),
      "Nombres": v([["واحد","wāhid","1"],["اثنان","ithnān","2"],["ثلاثة","thalātha","3"],["أربعة","arba'a","4"],["خمسة","khamsa","5"],["ستة","sitta","6"],["سبعة","sab'a","7"],["ثمانية","thamāniya","8"],["تسعة","tis'a","9"],["عشرة","'ashara","10"]]),
      "Couleurs": v([["أحمر","ahmar","rouge"],["أزرق","azraq","bleu"],["أخضر","akhdar","vert"],["أصفر","asfar","jaune"],["أسود","aswad","noir"],["أبيض","abyad","blanc"]])
    },
    grammar: [
      ["Sens d'écriture","L'arabe s'écrit et se lit de droite à gauche."],
      ["Racines","La plupart des mots dérivent d'une racine de 3 consonnes qui porte le sens de base."],
      ["Ordre des mots","L'arabe standard place souvent le verbe avant le sujet (VSO)."]
    ],
    reading: [["اسمي أحمد. أسكن في القاهرة.","Traduction : « Je m'appelle Ahmed. J'habite au Caire. »"]]
  },
  tr: { name: "Türkçe (Turc)", flag: "🇹🇷", color: "#C23B3B",
    scriptNote: "Le turc utilise l'alphabet latin avec des lettres spécifiques (ç, ğ, ı, ö, ş, ü).",
    vocab: {
      "Salutations": v([["Merhaba","","bonjour"],["Teşekkürler","","merci"],["Lütfen","","s'il te plaît"],["Evet","","oui"],["Hayır","","non"],["Hoşça kal","","au revoir"]]),
      "Nombres": v([["bir","","1"],["iki","","2"],["üç","","3"],["dört","","4"],["beş","","5"],["altı","","6"],["yedi","","7"],["sekiz","","8"],["dokuz","","9"],["on","","10"]]),
      "Couleurs": v([["kırmızı","","rouge"],["mavi","","bleu"],["yeşil","","vert"],["sarı","","jaune"],["siyah","","noir"],["beyaz","","blanc"]])
    },
    grammar: [
      ["Agglutination","Le turc ajoute des suffixes les uns après les autres à la racine du mot pour former le sens."],
      ["Harmonie vocalique","Les voyelles des suffixes s'adaptent à la dernière voyelle du mot."],
      ["Ordre des mots","Le turc suit l'ordre Sujet-Objet-Verbe."]
    ],
    reading: [["Benim adım Ali. İstanbul'da yaşıyorum.","Traduction : « Je m'appelle Ali. J'habite à Istanbul. »"]]
  },
  nl: { name: "Nederlands (Néerlandais)", flag: "🇳🇱", color: "#D9862E",
    scriptNote: "Le néerlandais utilise l'alphabet latin, proche de l'allemand et de l'anglais.",
    vocab: {
      "Salutations": v([["Hallo","","bonjour"],["Dank je","","merci"],["Alsjeblieft","","s'il te plaît"],["Ja","","oui"],["Nee","","non"],["Tot ziens","","au revoir"]]),
      "Nombres": v([["een","","1"],["twee","","2"],["drie","","3"],["vier","","4"],["vijf","","5"],["zes","","6"],["zeven","","7"],["acht","","8"],["negen","","9"],["tien","","10"]]),
      "Couleurs": v([["rood","","rouge"],["blauw","","bleu"],["groen","","vert"],["geel","","jaune"],["zwart","","noir"],["wit","","blanc"]])
    },
    grammar: [
      ["Ordre V2","Le verbe conjugué est toujours en deuxième position dans une phrase affirmative."],
      ["Deux genres","Les noms sont « de-woorden » ou « het-woorden », ce qui change l'article."],
      ["Proche de l'allemand/anglais","Beaucoup de vocabulaire est reconnaissable si on connaît l'anglais ou l'allemand."]
    ],
    reading: [["Ik heet Jan. Ik woon in Amsterdam.","Traduction : « Je m'appelle Jan. J'habite à Amsterdam. »"]]
  },
  el: { name: "Ελληνικά (Grec)", flag: "🇬🇷", color: "#2E6FA3",
    scriptNote: "Le grec moderne utilise son propre alphabet (24 lettres), différent du latin.",
    vocab: {
      "Salutations": v([["Γεια σου","yia sou","bonjour"],["Ευχαριστώ","efharistó","merci"],["Παρακαλώ","parakaló","s'il te plaît"],["Ναι","ne","oui"],["Όχι","óhi","non"],["Αντίο","adío","au revoir"]]),
      "Nombres": v([["ένα","éna","1"],["δύο","dío","2"],["τρία","tría","3"],["τέσσερα","tésera","4"],["πέντε","pénde","5"],["έξι","éxi","6"],["επτά","eptá","7"],["οκτώ","októ","8"],["εννέα","enéa","9"],["δέκα","déka","10"]]),
      "Couleurs": v([["κόκκινο","kókino","rouge"],["μπλε","ble","bleu"],["πράσινο","prásino","vert"],["κίτρινο","kítrino","jaune"],["μαύρο","mávro","noir"],["άσπρο","áspro","blanc"]])
    },
    grammar: [
      ["Alphabet propre","Le grec a son propre alphabet ; beaucoup de lettres scientifiques en français en viennent (π, β, Δ...)."],
      ["Trois genres","Les noms sont masculins, féminins ou neutres, avec des articles différents (ο, η, το)."],
      ["Déclinaisons","Les noms changent de terminaison selon leur fonction dans la phrase (cas)."]
    ],
    reading: [["Με λένε Νίκο. Μένω στην Αθήνα.","Traduction : « Je m'appelle Níkos. J'habite à Athènes. »"]]
  },
  pl: { name: "Polski (Polonais)", flag: "🇵🇱", color: "#B5453B",
    scriptNote: "Le polonais utilise l'alphabet latin avec des signes diacritiques (ł, ż, ą, ę, ś...).",
    vocab: {
      "Salutations": v([["Cześć","","bonjour/salut"],["Dziękuję","","merci"],["Proszę","","s'il te plaît"],["Tak","","oui"],["Nie","","non"],["Do widzenia","","au revoir"]]),
      "Nombres": v([["jeden","","1"],["dwa","","2"],["trzy","","3"],["cztery","","4"],["pięć","","5"],["sześć","","6"],["siedem","","7"],["osiem","","8"],["dziewięć","","9"],["dziesięć","","10"]]),
      "Couleurs": v([["czerwony","","rouge"],["niebieski","","bleu"],["zielony","","vert"],["żółty","","jaune"],["czarny","","noir"],["biały","","blanc"]])
    },
    grammar: [
      ["Sept cas","Les noms polonais se déclinent en 7 cas selon leur fonction dans la phrase."],
      ["Pas d'article","Le polonais n'a ni « le/la » ni « un/une »."],
      ["Trois genres","Masculin, féminin, neutre, visibles surtout au passé et à l'accord des adjectifs."]
    ],
    reading: [["Mam na imię Anna. Mieszkam w Warszawie.","Traduction : « Je m'appelle Anna. J'habite à Varsovie. »"]]
  },
  sv: { name: "Svenska (Suédois)", flag: "🇸🇪", color: "#2E6FB3",
    scriptNote: "Le suédois utilise l'alphabet latin avec trois lettres supplémentaires : å, ä, ö.",
    vocab: {
      "Salutations": v([["Hej","","bonjour/salut"],["Tack","","merci"],["Snälla","","s'il te plaît"],["Ja","","oui"],["Nej","","non"],["Hej då","","au revoir"]]),
      "Nombres": v([["ett","","1"],["två","","2"],["tre","","3"],["fyra","","4"],["fem","","5"],["sex","","6"],["sju","","7"],["åtta","","8"],["nio","","9"],["tio","","10"]]),
      "Couleurs": v([["röd","","rouge"],["blå","","bleu"],["grön","","vert"],["gul","","jaune"],["svart","","noir"],["vit","","blanc"]])
    },
    grammar: [
      ["Article suffixé","L'article défini s'attache à la fin du nom : bil (voiture) → bilen (la voiture)."],
      ["Ordre V2","Comme en néerlandais et allemand, le verbe conjugué reste en deuxième position."],
      ["Deux genres","« En » et « ett », qui déterminent la forme de l'article et des adjectifs."]
    ],
    reading: [["Jag heter Eva. Jag bor i Stockholm.","Traduction : « Je m'appelle Eva. J'habite à Stockholm. »"]]
  },
  vi: { name: "Tiếng Việt (Vietnamien)", flag: "🇻🇳", color: "#C2422E",
    scriptNote: "Le vietnamien s'écrit en alphabet latin avec des signes de ton (6 tons).",
    vocab: {
      "Salutations": v([["Xin chào","","bonjour"],["Cảm ơn","","merci"],["Làm ơn","","s'il te plaît"],["Vâng","","oui"],["Không","","non"],["Tạm biệt","","au revoir"]]),
      "Nombres": v([["một","","1"],["hai","","2"],["ba","","3"],["bốn","","4"],["năm","","5"],["sáu","","6"],["bảy","","7"],["tám","","8"],["chín","","9"],["mười","","10"]]),
      "Couleurs": v([["đỏ","","rouge"],["xanh dương","","bleu"],["xanh lá","","vert"],["vàng","","jaune"],["đen","","noir"],["trắng","","blanc"]])
    },
    grammar: [
      ["Langue à tons","Chaque syllabe porte un des 6 tons, qui change complètement le sens du mot."],
      ["Pas de conjugaison","Les verbes ne changent jamais de forme ; le temps est indiqué par des mots (đã, sẽ, đang)."],
      ["Ordre des mots","Sujet-Verbe-Objet, comme en français."]
    ],
    reading: [["Tôi tên là Lan. Tôi sống ở Hà Nội.","Traduction : « Je m'appelle Lan. J'habite à Hanoï. »"]]
  },
  la: { name: "Latina (Latin)", flag: "📜", color: "#8A6A3D",
    scriptNote: "Le latin classique s'écrit en alphabet latin (bien sûr) ; c'est la langue-mère du français.",
    vocab: {
      "Salutations": v([["Salve","","bonjour"],["Gratias tibi ago","","merci"],["Quaeso","","s'il te plaît"],["Ita / Sane","","oui"],["Non","","non"],["Vale","","au revoir"]]),
      "Nombres": v([["unus","","1"],["duo","","2"],["tres","","3"],["quattuor","","4"],["quinque","","5"],["sex","","6"],["septem","","7"],["octo","","8"],["novem","","9"],["decem","","10"]]),
      "Couleurs": v([["ruber","","rouge"],["caeruleus","","bleu"],["viridis","","vert"],["flavus","","jaune"],["niger","","noir"],["albus","","blanc"]])
    },
    grammar: [
      ["Déclinaisons","Les noms latins changent de terminaison selon leur fonction (nominatif, génitif, datif, accusatif, ablatif)."],
      ["Ordre libre","Grâce aux déclinaisons, l'ordre des mots est très souple ; le verbe finit souvent la phrase."],
      ["Ancêtre du français","Beaucoup de mots français viennent directement du latin (aqua → eau, via → voie)."]
    ],
    reading: [["Nomen mihi est Marcus. Romae habito.","Traduction : « Je m'appelle Marcus. J'habite à Rome. »"]]
  },
  nb: { name: "Norsk bokmål (Norvégien)", flag: "🇳🇴", color: "#2E4A9E",
    scriptNote: "Le norvégien bokmål utilise l'alphabet latin avec æ, ø, å.",
    vocab: {
      "Salutations": v([["Hei","","bonjour/salut"],["Takk","","merci"],["Vær så snill","","s'il te plaît"],["Ja","","oui"],["Nei","","non"],["Ha det","","au revoir"]]),
      "Nombres": v([["en","","1"],["to","","2"],["tre","","3"],["fire","","4"],["fem","","5"],["seks","","6"],["sju","","7"],["åtte","","8"],["ni","","9"],["ti","","10"]]),
      "Couleurs": v([["rød","","rouge"],["blå","","bleu"],["grønn","","vert"],["gul","","jaune"],["svart","","noir"],["hvit","","blanc"]])
    },
    grammar: [
      ["Article suffixé","Comme en suédois, l'article défini s'attache à la fin du nom : hus → huset."],
      ["Ordre V2","Le verbe conjugué occupe la deuxième position de la phrase."],
      ["Proche du danois à l'écrit","Le bokmål écrit ressemble beaucoup au danois, mais se prononce différemment."]
    ],
    reading: [["Jeg heter Ola. Jeg bor i Oslo.","Traduction : « Je m'appelle Ola. J'habite à Oslo. »"]]
  },
  ga: { name: "Gaeilge (Irlandais)", flag: "🇮🇪", color: "#2E7D46",
    scriptNote: "L'irlandais (gaélique irlandais) s'écrit en alphabet latin avec des accents longs (á, é, í, ó, ú).",
    vocab: {
      "Salutations": v([["Dia dhuit","dee-a gwit","bonjour"],["Go raibh maith agat","gur-uh mah ug-ut","merci"],["Le do thoil","le duh hull","s'il te plaît"],["Tá","taw","oui"],["Níl","neel","non"],["Slán","slawn","au revoir"]]),
      "Nombres": v([["a haon","uh hayn","1"],["a dó","uh doe","2"],["a trí","uh tree","3"],["a ceathair","uh ka-hir","4"],["a cúig","uh koo-ig","5"],["a sé","uh shay","6"],["a seacht","uh shakht","7"],["a hocht","uh hukht","8"],["a naoi","uh nee","9"],["a deich","uh jeh","10"]]),
      "Couleurs": v([["dearg","jarrug","rouge"],["gorm","gurrum","bleu"],["glas","glass","vert"],["buí","bwee","jaune"],["dubh","duv","noir"],["bán","bawn","blanc"]])
    },
    grammar: [
      ["Ordre VSO","Le verbe se place en premier dans la phrase : Tá mé (je suis, littéralement « suis je »)."],
      ["Mutations initiales","La première consonne d'un mot peut changer selon le contexte grammatical."],
      ["Pas de « oui »/« non » directs","On répond en répétant le verbe de la question, à la forme positive ou négative."]
    ],
    reading: [["Is mise Séamas. Tá mé i mo chónaí i mBaile Átha Cliath.","Traduction : « Je suis Séamas. J'habite à Dublin. »"]]
  },
  id: { name: "Bahasa Indonesia (Indonésien)", flag: "🇮🇩", color: "#B5322E",
    scriptNote: "L'indonésien utilise l'alphabet latin ; c'est une langue relativement régulière et facile à prononcer.",
    vocab: {
      "Salutations": v([["Halo","","bonjour"],["Terima kasih","","merci"],["Tolong","","s'il te plaît"],["Ya","","oui"],["Tidak","","non"],["Selamat tinggal","","au revoir"]]),
      "Nombres": v([["satu","","1"],["dua","","2"],["tiga","","3"],["empat","","4"],["lima","","5"],["enam","","6"],["tujuh","","7"],["delapan","","8"],["sembilan","","9"],["sepuluh","","10"]]),
      "Couleurs": v([["merah","","rouge"],["biru","","bleu"],["hijau","","vert"],["kuning","","jaune"],["hitam","","noir"],["putih","","blanc"]])
    },
    grammar: [
      ["Pas de conjugaison","Les verbes indonésiens ne changent jamais de forme, quel que soit le sujet ou le temps."],
      ["Pluriel par répétition","On double parfois le mot pour marquer le pluriel : buku (livre) → buku-buku (livres)."],
      ["Ordre des mots","Sujet-Verbe-Objet, comme en français."]
    ],
    reading: [["Nama saya Budi. Saya tinggal di Jakarta.","Traduction : « Je m'appelle Budi. J'habite à Jakarta. »"]]
  },
  val: { name: "High Valyrian (Haut Valyrien)", flag: "🐉", color: "#5A2E7D",
    scriptNote: "Langue construite pour la série « Game of Thrones » par le linguiste David J. Peterson. Le vocabulaire publié est limité : ce module reste volontairement minimal.",
    vocab: {
      "Expressions connues": v([["Valar morghulis","","tous les hommes doivent mourir"],["Valar dohaeris","","tous les hommes doivent servir"],["Kirimvose","","merci"],["Skoros jaqagon nyke","","que dois-je faire ?"],["Dracarys","","feu de dragon (ordre de cracher le feu)"],["Rytsas","","salut / bien"]])
    },
    grammar: [
      ["Langue construite","Le haut valyrien a été créé pour la fiction : son vocabulaire documenté est bien plus restreint qu'une langue naturelle."],
      ["Déclinaisons","Comme le latin, le haut valyrien décline ses noms selon leur fonction dans la phrase."],
      ["Quatre genres","Il distingue quatre genres grammaticaux : lunaire, solaire, terrestre et aquatique."]
    ],
    reading: [["Valar morghulis. Valar dohaeris.","Traduction : « Tous les hommes doivent mourir. Tous les hommes doivent servir. » (réplique culte de la série)"]]
  },
  uk: { name: "Українська (Ukrainien)", flag: "🇺🇦", color: "#2E6FB3",
    scriptNote: "L'ukrainien s'écrit en alphabet cyrillique, proche du russe mais avec des différences notables.",
    vocab: {
      "Salutations": v([["Привіт","pryvit","bonjour/salut"],["Дякую","dyakuyu","merci"],["Будь ласка","bud laska","s'il te plaît"],["Так","tak","oui"],["Ні","ni","non"],["До побачення","do pobachennya","au revoir"]]),
      "Nombres": v([["один","odyn","1"],["два","dva","2"],["три","try","3"],["чотири","chotyry","4"],["п'ять","pyat","5"],["шість","shist","6"],["сім","sim","7"],["вісім","visim","8"],["дев'ять","devyat","9"],["десять","desyat","10"]]),
      "Couleurs": v([["червоний","chervonyi","rouge"],["синій","syniy","bleu"],["зелений","zelenyi","vert"],["жовтий","zhovtyi","jaune"],["чорний","chornyi","noir"],["білий","bilyi","blanc"]])
    },
    grammar: [
      ["Alphabet cyrillique","L'ukrainien utilise le cyrillique, avec quelques lettres propres comme ї, є, і, ґ."],
      ["Sept cas","Les noms se déclinent selon leur fonction dans la phrase, comme en polonais."],
      ["Pas d'article","Il n'y a ni « le/la » ni « un/une » en ukrainien."]
    ],
    reading: [["Мене звати Олена. Я живу в Києві.","Traduction : « Je m'appelle Olena. J'habite à Kyiv. »"]]
  },
  fi: { name: "Suomi (Finnois)", flag: "🇫🇮", color: "#2E6FB3",
    scriptNote: "Le finnois utilise l'alphabet latin ; c'est une langue finno-ougrienne, très différente du français.",
    vocab: {
      "Salutations": v([["Hei","","bonjour/salut"],["Kiitos","","merci"],["Ole hyvä","","s'il te plaît"],["Kyllä","","oui"],["Ei","","non"],["Näkemiin","","au revoir"]]),
      "Nombres": v([["yksi","","1"],["kaksi","","2"],["kolme","","3"],["neljä","","4"],["viisi","","5"],["kuusi","","6"],["seitsemän","","7"],["kahdeksan","","8"],["yhdeksän","","9"],["kymmenen","","10"]]),
      "Couleurs": v([["punainen","","rouge"],["sininen","","bleu"],["vihreä","","vert"],["keltainen","","jaune"],["musta","","noir"],["valkoinen","","blanc"]])
    },
    grammar: [
      ["Quinze cas","Le finnois possède environ 15 cas grammaticaux, souvent là où le français utilise des prépositions."],
      ["Pas de genre ni d'article","Il n'y a ni masculin/féminin, ni « le/la »/« un/une »."],
      ["Agglutination","Les suffixes s'ajoutent les uns aux autres pour former des mots parfois très longs."]
    ],
    reading: [["Nimeni on Mikko. Asun Helsingissä.","Traduction : « Je m'appelle Mikko. J'habite à Helsinki. »"]]
  },
  da: { name: "Dansk (Danois)", flag: "🇩🇰", color: "#B5322E",
    scriptNote: "Le danois utilise l'alphabet latin avec æ, ø, å, proche du norvégien à l'écrit.",
    vocab: {
      "Salutations": v([["Hej","","bonjour/salut"],["Tak","","merci"],["Vær venlig","","s'il te plaît"],["Ja","","oui"],["Nej","","non"],["Farvel","","au revoir"]]),
      "Nombres": v([["en","","1"],["to","","2"],["tre","","3"],["fire","","4"],["fem","","5"],["seks","","6"],["syv","","7"],["otte","","8"],["ni","","9"],["ti","","10"]]),
      "Couleurs": v([["rød","","rouge"],["blå","","bleu"],["grøn","","vert"],["gul","","jaune"],["sort","","noir"],["hvid","","blanc"]])
    },
    grammar: [
      ["Article suffixé","L'article défini se colle à la fin du mot : hus → huset (la maison)."],
      ["Ordre V2","Le verbe conjugué reste en deuxième position de la phrase."],
      ["Prononciation particulière","Le danois écrit ressemble au norvégien mais se prononce très différemment, avec beaucoup de sons avalés."]
    ],
    reading: [["Jeg hedder Peter. Jeg bor i København.","Traduction : « Je m'appelle Peter. J'habite à Copenhague. »"]]
  },
  ro: { name: "Română (Roumain)", flag: "🇷🇴", color: "#2E4A9E",
    scriptNote: "Le roumain est une langue romane (comme le français) qui s'écrit en alphabet latin.",
    vocab: {
      "Salutations": v([["Bună","","bonjour/salut"],["Mulțumesc","","merci"],["Te rog","","s'il te plaît"],["Da","","oui"],["Nu","","non"],["La revedere","","au revoir"]]),
      "Nombres": v([["unu","","1"],["doi","","2"],["trei","","3"],["patru","","4"],["cinci","","5"],["șase","","6"],["șapte","","7"],["opt","","8"],["nouă","","9"],["zece","","10"]]),
      "Couleurs": v([["roșu","","rouge"],["albastru","","bleu"],["verde","","vert"],["galben","","jaune"],["negru","","noir"],["alb","","blanc"]])
    },
    grammar: [
      ["Langue romane","Le roumain vient du latin comme le français ; beaucoup de mots se ressemblent (casă = maison)."],
      ["Article suffixé","L'article défini s'attache à la fin du nom : om (homme) → omul (l'homme)."],
      ["Reste des cas latins","Le roumain a gardé un petit système de cas, contrairement au français."]
    ],
    reading: [["Mă numesc Ana. Locuiesc în București.","Traduction : « Je m'appelle Ana. J'habite à Bucarest. »"]]
  },
  cs: { name: "Čeština (Tchèque)", flag: "🇨🇿", color: "#B5322E",
    scriptNote: "Le tchèque s'écrit en alphabet latin avec de nombreux signes diacritiques (č, ř, š, ž...).",
    vocab: {
      "Salutations": v([["Ahoj","","bonjour/salut"],["Děkuji","","merci"],["Prosím","","s'il te plaît"],["Ano","","oui"],["Ne","","non"],["Na shledanou","","au revoir"]]),
      "Nombres": v([["jeden","","1"],["dva","","2"],["tři","","3"],["čtyři","","4"],["pět","","5"],["šest","","6"],["sedm","","7"],["osm","","8"],["devět","","9"],["deset","","10"]]),
      "Couleurs": v([["červená","","rouge"],["modrá","","bleu"],["zelená","","vert"],["žlutá","","jaune"],["černá","","noir"],["bílá","","blanc"]])
    },
    grammar: [
      ["Sept cas","Comme le polonais et l'ukrainien, le tchèque décline ses noms en 7 cas."],
      ["Pas d'article","Il n'y a ni « le/la » ni « un/une »."],
      ["Consonnes qui sonnent","Certains mots n'ont pas de voyelle du tout : « vrba » (saule), « prst » (doigt)."]
    ],
    reading: [["Jmenuji se Petr. Bydlím v Praze.","Traduction : « Je m'appelle Petr. J'habite à Prague. »"]]
  },
  zu: { name: "isiZulu (Zoulou)", flag: "🇿🇦", color: "#C2622A",
    scriptNote: "Le zoulou est une langue bantoue d'Afrique du Sud, à système de classes nominales. Vocabulaire best-effort.",
    vocab: {
      "Salutations": v([["Sawubona","","bonjour"],["Ngiyabonga","","merci"],["Ngicela","","s'il te plaît"],["Yebo","","oui"],["Cha","","non"],["Sala kahle","","au revoir"]]),
      "Nombres": v([["kunye","","1"],["kubili","","2"],["kuthathu","","3"],["kune","","4"],["kuhlanu","","5"],["isithupha","","6"],["isikhombisa","","7"],["isishiyagalombili","","8"],["isishiyagalolunye","","9"],["ishumi","","10"]])
    },
    grammar: [
      ["Classes nominales","Le zoulou classe ses noms en une quinzaine de « classes », chacune avec ses propres préfixes."],
      ["Langue agglutinante","Les verbes portent de nombreux préfixes/suffixes indiquant sujet, objet, temps."],
      ["Clics consonantiques","Le zoulou comporte des consonnes « clics », rares dans les autres langues du monde."]
    ],
    reading: [["Igama lami nginguThabo. Ngihlala eThekwini.","Traduction (best-effort) : « Je m'appelle Thabo. J'habite à Durban. »"]]
  },
  haw: { name: "ʻŌlelo Hawaiʻi (Hawaïen)", flag: "🌺", color: "#2E9E6D",
    scriptNote: "L'hawaïen ne compte que 13 lettres (dont le ʻokina, une consonne glottale notée ʻ).",
    vocab: {
      "Salutations": v([["Aloha","","bonjour / au revoir"],["Mahalo","","merci"],["E ʻoluʻolu","","s'il te plaît"],["ʻAe","","oui"],["ʻAʻole","","non"],["A hui hou","","à bientôt"]]),
      "Nombres": v([["kahi","","1"],["lua","","2"],["kolu","","3"],["hā","","4"],["lima","","5"],["ono","","6"],["hiku","","7"],["walu","","8"],["iwa","","9"],["ʻumi","","10"]]),
      "Couleurs": v([["ʻulaʻula","","rouge"],["uliuli","","bleu"],["ʻōmaʻomaʻo","","vert"],["melemele","","jaune"],["ʻeleʻele","","noir"],["keʻokeʻo","","blanc"]])
    },
    grammar: [
      ["Alphabet minimal","Seulement 13 lettres (5 voyelles, 8 consonnes) plus le ʻokina et le kahakō (trait allongeant une voyelle)."],
      ["Ordre VSO","Le verbe se place en premier dans la phrase, avant le sujet."],
      ["Pas de consonnes groupées","Chaque syllabe se termine par une voyelle, ce qui donne sa musicalité à la langue."]
    ],
    reading: [["ʻO Kai koʻu inoa. Noho au ma Honolulu.","Traduction : « Je m'appelle Kai. J'habite à Honolulu. »"]]
  },
  sw: { name: "Kiswahili (Swahili)", flag: "🌍", color: "#2E7D5B",
    scriptNote: "Le swahili est une langue bantoue très parlée en Afrique de l'Est, écrite en alphabet latin.",
    vocab: {
      "Salutations": v([["Habari","","bonjour (litt. « nouvelles »)"],["Asante","","merci"],["Tafadhali","","s'il te plaît"],["Ndiyo","","oui"],["Hapana","","non"],["Kwaheri","","au revoir"]]),
      "Nombres": v([["moja","","1"],["mbili","","2"],["tatu","","3"],["nne","","4"],["tano","","5"],["sita","","6"],["saba","","7"],["nane","","8"],["tisa","","9"],["kumi","","10"]]),
      "Couleurs": v([["nyekundu","","rouge"],["buluu","","bleu"],["kijani","","vert"],["njano","","jaune"],["nyeusi","","noir"],["nyeupe","","blanc"]])
    },
    grammar: [
      ["Classes nominales","Comme le zoulou, le swahili organise ses noms en classes qui déterminent les accords grammaticaux."],
      ["Ordre des mots","Sujet-Verbe-Objet, avec des préfixes verbaux marquant sujet et temps."],
      ["Vocabulaire mêlé","Le swahili a emprunté de nombreux mots à l'arabe (kitabu = livre, du mot arabe pour « livre »)."]
    ],
    reading: [["Jina langu ni Amina. Ninaishi Nairobi.","Traduction : « Je m'appelle Amina. J'habite à Nairobi. »"]]
  },
  cy: { name: "Cymraeg (Gallois)", flag: "🏴", color: "#2E7D46",
    scriptNote: "Le gallois s'écrit en alphabet latin, avec des doubles-lettres qui comptent comme une seule (ll, ch, dd).",
    vocab: {
      "Salutations": v([["Helo","","bonjour"],["Diolch","","merci"],["Os gwelwch yn dda","","s'il te plaît"],["Ie","","oui"],["Na","","non"],["Hwyl fawr","","au revoir"]]),
      "Nombres": v([["un","","1"],["dau","","2"],["tri","","3"],["pedwar","","4"],["pump","","5"],["chwech","","6"],["saith","","7"],["wyth","","8"],["naw","","9"],["deg","","10"]]),
      "Couleurs": v([["coch","","rouge"],["glas","","bleu"],["gwyrdd","","vert"],["melyn","","jaune"],["du","","noir"],["gwyn","","blanc"]])
    },
    grammar: [
      ["Ordre VSO","Comme l'irlandais et le gaélique écossais, le verbe vient en premier dans la phrase."],
      ["Mutations initiales","La première lettre d'un mot peut changer selon ce qui le précède (ex. « ci » → « gi » après certains mots)."],
      ["Langue celtique vivante","Le gallois reste parlé quotidiennement par des centaines de milliers de personnes au Pays de Galles."]
    ],
    reading: [["Fy enw i yw Rhys. Dwi'n byw yng Nghaerdydd.","Traduction : « Je m'appelle Rhys. J'habite à Cardiff. »"]]
  },
  hu: { name: "Magyar (Hongrois)", flag: "🇭🇺", color: "#B5322E",
    scriptNote: "Le hongrois utilise l'alphabet latin avec de nombreux accents (á, é, í, ó, ö, ő, ú, ü, ű).",
    vocab: {
      "Salutations": v([["Szia","","bonjour/salut"],["Köszönöm","","merci"],["Kérlek","","s'il te plaît"],["Igen","","oui"],["Nem","","non"],["Viszlát","","au revoir"]]),
      "Nombres": v([["egy","","1"],["kettő","","2"],["három","","3"],["négy","","4"],["öt","","5"],["hat","","6"],["hét","","7"],["nyolc","","8"],["kilenc","","9"],["tíz","","10"]]),
      "Couleurs": v([["piros","","rouge"],["kék","","bleu"],["zöld","","vert"],["sárga","","jaune"],["fekete","","noir"],["fehér","","blanc"]])
    },
    grammar: [
      ["Une vingtaine de cas","Le hongrois utilise de nombreux suffixes de cas au lieu de prépositions."],
      ["Harmonie vocalique","Comme le turc et le finnois, les suffixes s'adaptent aux voyelles du mot."],
      ["Langue finno-ougrienne","Le hongrois n'est apparenté à presque aucune langue voisine (parent lointain du finnois)."]
    ],
    reading: [["A nevem Kata. Budapesten élek.","Traduction : « Je m'appelle Kata. J'habite à Budapest. »"]]
  },
  gd: { name: "Gàidhlig (Gaélique écossais)", flag: "🏴", color: "#2E4A9E",
    scriptNote: "Le gaélique écossais est une langue celtique proche de l'irlandais, écrite en alphabet latin.",
    vocab: {
      "Salutations": v([["Halò","","bonjour"],["Tapadh leibh","","merci"],["Mas e ur toil e","","s'il te plaît"],["Tha","","oui"],["Chan eil","","non"],["Mar sin leat","","au revoir"]]),
      "Nombres": v([["a h-aon","","1"],["a dhà","","2"],["a trì","","3"],["a ceithir","","4"],["a còig","","5"],["a sia","","6"],["a seachd","","7"],["a h-ochd","","8"],["a naoi","","9"],["a deich","","10"]]),
      "Couleurs": v([["dearg","","rouge"],["gorm","","bleu"],["uaine","","vert"],["buidhe","","jaune"],["dubh","","noir"],["geal","","blanc"]])
    },
    grammar: [
      ["Ordre VSO","Le verbe se place en premier, comme en irlandais et en gallois."],
      ["Mutations (lénition)","La première consonne d'un mot peut s'adoucir selon le contexte grammatical."],
      ["Proche cousin de l'irlandais","Le gaélique écossais et l'irlandais sont mutuellement compréhensibles en partie, un peu comme l'espagnol et le portugais."]
    ],
    reading: [["Is mise Ailean. Tha mi a' fuireach ann an Glaschu.","Traduction : « Je suis Ailean. J'habite à Glasgow. »"]]
  },
  ht: { name: "Kreyòl ayisyen (Créole haïtien)", flag: "🇭🇹", color: "#2E6FA3",
    scriptNote: "Le créole haïtien s'écrit en alphabet latin, avec une orthographe phonétique régulière et un vocabulaire majoritairement issu du français.",
    vocab: {
      "Salutations": v([["Bonjou","","bonjour"],["Mèsi","","merci"],["Souple","","s'il te plaît"],["Wi","","oui"],["Non","","non"],["Orevwa","","au revoir"]]),
      "Nombres": v([["en","","1"],["de","","2"],["twa","","3"],["kat","","4"],["senk","","5"],["sis","","6"],["sèt","","7"],["uit","","8"],["nèf","","9"],["dis","","10"]]),
      "Couleurs": v([["wouj","","rouge"],["ble","","bleu"],["vèt","","vert"],["jòn","","jaune"],["nwa","","noir"],["blan","","blanc"]])
    },
    grammar: [
      ["Pas de conjugaison","Les verbes ne changent jamais de forme ; le temps est marqué par des mots placés avant : mwen ap manje (je mange/suis en train de manger)."],
      ["Vocabulaire d'origine française","Beaucoup de mots sont reconnaissables pour un francophone, mais la grammaire est très différente."],
      ["Orthographe phonétique","Contrairement au français, le créole haïtien s'écrit exactement comme il se prononce."]
    ],
    reading: [["Mwen rele Jan. Mwen rete Pòtoprens.","Traduction : « Je m'appelle Jean. J'habite à Port-au-Prince. »"]]
  },
  eo: { name: "Esperanto", flag: "🌐", color: "#2E9E6D",
    scriptNote: "L'espéranto est une langue construite créée en 1887 pour être facile à apprendre et parfaitement régulière.",
    vocab: {
      "Salutations": v([["Saluton","","bonjour"],["Dankon","","merci"],["Bonvolu","","s'il te plaît"],["Jes","","oui"],["Ne","","non"],["Ĝis revido","","au revoir"]]),
      "Nombres": v([["unu","","1"],["du","","2"],["tri","","3"],["kvar","","4"],["kvin","","5"],["ses","","6"],["sep","","7"],["ok","","8"],["naŭ","","9"],["dek","","10"]]),
      "Couleurs": v([["ruĝa","","rouge"],["blua","","bleu"],["verda","","vert"],["flava","","jaune"],["nigra","","noir"],["blanka","","blanc"]])
    },
    grammar: [
      ["Totalement régulier","Aucune exception : tous les noms finissent en -o, les adjectifs en -a, les verbes en -as/-is/-os."],
      ["Vocabulaire mêlé","Les racines viennent surtout des langues romanes, germaniques et slaves, ce qui les rend souvent reconnaissables."],
      ["Facile à apprendre","Conçu pour être appris environ 4 fois plus vite qu'une langue naturelle comparable."]
    ],
    reading: [["Mi nomiĝas Eva. Mi loĝas en Parizo.","Traduction : « Je m'appelle Eva. J'habite à Paris. »"]]
  },
  tlh: { name: "tlhIngan Hol (Klingon)", flag: "🖖", color: "#5A2E2E",
    scriptNote: "Langue construite par le linguiste Marc Okrand pour « Star Trek ». Vocabulaire et grammaire volontairement limités ici : ressources fiables rares.",
    vocab: {
      "Expressions connues": v([["nuqneH","","bonjour (litt. « que veux-tu ? »)"],["qatlho'","","merci"],["Qapla'","","succès ! (salutation/vœu)"],["HIja'","","oui"],["ghobe'","","non"],["Heghlu'meH QaQ jajvam","","c'est un bon jour pour mourir (phrase culte)"]])
    },
    grammar: [
      ["Ordre OVS","Le klingon place l'objet avant le verbe, puis le sujet : un ordre très rare parmi les langues du monde (et naturelles)."],
      ["Langue construite pour la fiction","Créée pour sonner « extraterrestre » et grammaticalement cohérente, avec un vocabulaire volontairement martial."],
      ["Agglutination verbale","Le verbe klingon porte de nombreux préfixes et suffixes obligatoires (sujet, objet, aspect...)."]
    ],
    reading: [["Qapla'! nuqneH?","Traduction : « Succès ! Que veux-tu (= bonjour) ? » — salutation typique entre Klingons."]]
  },
  nv: { name: "Diné bizaad (Navajo)", flag: "🪶", color: "#C2622A",
    scriptNote: "Le navajo (diné bizaad) est une langue tonale et polysynthétique parlée par la nation Navajo (sud-ouest des États-Unis). Vocabulaire best-effort.",
    vocab: {
      "Salutations": v([["Yá'át'ééh","","bonjour"],["Ahéhee'","","merci"],["Aoo'","","oui"],["Dooda","","non"],["Hágoónee'","","au revoir"]]),
      "Nombres": v([["t'ááłá'í","","1"],["naaki","","2"],["táá'","","3"],["dį́į́'","","4"],["ashdla'","","5"],["hastą́ą́","","6"],["tsosts'id","","7"],["tseebíí","","8"],["náhást'éí","","9"],["neeznáá","","10"]])
    },
    grammar: [
      ["Verbe en fin de phrase","Le navajo suit l'ordre Sujet-Objet-Verbe, avec une morphologie verbale extrêmement riche."],
      ["Langue tonale","Chaque voyelle porte un ton haut ou bas qui change le sens du mot."],
      ["Polysynthétique","Un seul mot-verbe peut porter à lui seul le sens de toute une phrase française."]
    ],
    reading: [["Shí éí John yinishyé.","Traduction (best-effort) : « Je m'appelle John. »"]]
  }
};
