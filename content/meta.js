// Per-language metadata used by the course engine.
//  tts         BCP-47 tag for speech synthesis/recognition
//  ttsFallback voice used when the device has no voice for `tts` (the engine
//              then tells the learner the voice is approximate)
//  dir/font    writing direction and font stack of the language being learned
//  kb          extra keys of the virtual keyboard (writing/dictation exercises)
//  greeting    shown in the hub's hero
const L = (s) => s.split(" ");
const CYR_RU = L("а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я");
const CYR_UK = L("а б в г ґ д е є ж з и і ї й к л м н о п р с т у ф х ц ч ш щ ь ю я ʼ");
const GREEK = L("α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ ς τ υ φ χ ψ ω ά έ ή ί ό ύ ώ");
const HEBREW = L("א ב ג ד ה ו ז ח ט י כ ך ל מ ם נ ן ס ע פ ף צ ץ ק ר ש ת");
const ARABIC = L("ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ء أ إ آ ى ئ ؤ");
const DEVA = L("अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ च छ ज झ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह ा ि ी ु ू े ै ो ौ ं ः ् ँ");
const HEB_FONT = "'New Peninim MT','Arial Hebrew','SBL Hebrew','Noto Sans Hebrew',var(--ig27-font-family)";

module.exports = {
  en: { name: "English", flag: "🇬🇧", tts: "en-GB", greeting: "Hello", kb: ["'"], watermark: "Aa" },
  es: { name: "Español", flag: "🇪🇸", tts: "es-ES", greeting: "¡Hola", kb: L("á é í ó ú ñ ü ¿ ¡"), watermark: "ñ" },
  it: { name: "Italiano", flag: "🇮🇹", tts: "it-IT", greeting: "Ciao", kb: L("à è é ì ò ù"), watermark: "è" },
  he: { name: "עברית", flag: "🇮🇱", tts: "he-IL", greeting: "שָׁלוֹם", dir: "rtl", font: HEB_FONT, kb: HEBREW, watermark: "א" },
  zh: { name: "中文", flag: "🇨🇳", tts: "zh-CN", greeting: "你好", watermark: "字" },
  pt: { name: "Português", flag: "🇵🇹", tts: "pt-PT", ttsFallback: "pt-BR", greeting: "Olá", kb: L("á â ã à ç é ê í ó ô õ ú"), watermark: "ã" },
  ru: { name: "Русский", flag: "🇷🇺", tts: "ru-RU", greeting: "Привет", kb: CYR_RU, watermark: "Ж" },
  de: { name: "Deutsch", flag: "🇩🇪", tts: "de-DE", greeting: "Hallo", kb: L("ä ö ü ß Ä Ö Ü"), watermark: "ß" },
  ja: { name: "日本語", flag: "🇯🇵", tts: "ja-JP", greeting: "こんにちは", watermark: "あ" },
  fr: { name: "Français", flag: "🇫🇷", tts: "fr-FR", greeting: "Bonjour", kb: L("é è ê ë à â ç î ï ô ù û ü œ æ"), watermark: "é" },
  hi: { name: "हिन्दी", flag: "🇮🇳", tts: "hi-IN", greeting: "नमस्ते", font: "'Kohinoor Devanagari','Noto Sans Devanagari','Nirmala UI',var(--ig27-font-family)", kb: DEVA, watermark: "अ" },
  ko: { name: "한국어", flag: "🇰🇷", tts: "ko-KR", greeting: "안녕하세요", watermark: "한" },
  ar: { name: "العربية", flag: "🇸🇦", tts: "ar-SA", greeting: "مَرْحَبًا", dir: "rtl", font: "'Geeza Pro','Noto Naskh Arabic','Segoe UI',var(--ig27-font-family)", kb: ARABIC, watermark: "ع" },
  tr: { name: "Türkçe", flag: "🇹🇷", tts: "tr-TR", greeting: "Merhaba", kb: L("ç ğ ı İ ö ş ü"), watermark: "ğ" },
  nl: { name: "Nederlands", flag: "🇳🇱", tts: "nl-NL", greeting: "Hallo", kb: L("é ë ï ó ö ü"), watermark: "ij" },
  el: { name: "Ελληνικά", flag: "🇬🇷", tts: "el-GR", greeting: "Γεια σου", kb: GREEK, watermark: "Ω" },
  pl: { name: "Polski", flag: "🇵🇱", tts: "pl-PL", greeting: "Cześć", kb: L("ą ć ę ł ń ó ś ź ż"), watermark: "ł" },
  sv: { name: "Svenska", flag: "🇸🇪", tts: "sv-SE", greeting: "Hej", kb: L("å ä ö"), watermark: "å" },
  vi: { name: "Tiếng Việt", flag: "🇻🇳", tts: "vi-VN", greeting: "Xin chào", kb: L("ă â đ ê ô ơ ư à á ả ã ạ ề ế ể ễ ệ ờ ớ ở ỡ ợ ừ ứ ử ữ ự"), watermark: "ơ" },
  la: { name: "Latina", flag: "📜", tts: "la", ttsFallback: "it-IT", greeting: "Salve", kb: L("ā ē ī ō ū"), watermark: "Æ" },
  nb: { name: "Norsk bokmål", flag: "🇳🇴", tts: "nb-NO", ttsFallback: "da-DK", greeting: "Hei", kb: L("æ ø å"), watermark: "ø" },
  ga: { name: "Gaeilge", flag: "🇮🇪", tts: "ga-IE", ttsFallback: "en-IE", greeting: "Dia duit", kb: L("á é í ó ú"), watermark: "☘" },
  id: { name: "Bahasa Indonesia", flag: "🇮🇩", tts: "id-ID", ttsFallback: "ms-MY", greeting: "Halo", watermark: "Aa" },
  val: { name: "High Valyrian", flag: "🐉", tts: "val", ttsFallback: "it-IT", greeting: "Rytsas", kb: L("ā ē ī ō ū ȳ"), watermark: "🐉" },
  uk: { name: "Українська", flag: "🇺🇦", tts: "uk-UA", ttsFallback: "ru-RU", greeting: "Привіт", kb: CYR_UK, watermark: "Ї" },
  fi: { name: "Suomi", flag: "🇫🇮", tts: "fi-FI", greeting: "Hei", kb: L("ä ö å"), watermark: "ä" },
  da: { name: "Dansk", flag: "🇩🇰", tts: "da-DK", ttsFallback: "nb-NO", greeting: "Hej", kb: L("æ ø å"), watermark: "æ" },
  ro: { name: "Română", flag: "🇷🇴", tts: "ro-RO", ttsFallback: "it-IT", greeting: "Salut", kb: L("ă â î ș ț"), watermark: "ș" },
  cs: { name: "Čeština", flag: "🇨🇿", tts: "cs-CZ", ttsFallback: "sk-SK", greeting: "Ahoj", kb: L("á č ď é ě í ň ó ř š ť ú ů ý ž"), watermark: "ř" },
  zu: { name: "isiZulu", flag: "🇿🇦", tts: "zu-ZA", ttsFallback: "en-ZA", greeting: "Sawubona", watermark: "Z" },
  haw: { name: "ʻŌlelo Hawaiʻi", flag: "🌺", tts: "haw", ttsFallback: "it-IT", greeting: "Aloha", kb: L("ā ē ī ō ū ʻ"), watermark: "ʻ" },
  sw: { name: "Kiswahili", flag: "🌍", tts: "sw-KE", ttsFallback: "sw-TZ", greeting: "Habari", watermark: "S" },
  cy: { name: "Cymraeg", flag: "🏴", tts: "cy-GB", ttsFallback: "en-GB", greeting: "Shwmae", kb: L("â ê î ô û ŵ ŷ"), watermark: "ŵ" },
  hu: { name: "Magyar", flag: "🇭🇺", tts: "hu-HU", greeting: "Szia", kb: L("á é í ó ö ő ú ü ű"), watermark: "ő" },
  gd: { name: "Gàidhlig", flag: "🏴", tts: "gd-GB", ttsFallback: "en-GB", greeting: "Halò", kb: L("à è ì ò ù"), watermark: "à" },
  ht: { name: "Kreyòl ayisyen", flag: "🇭🇹", tts: "ht-HT", ttsFallback: "fr-FR", greeting: "Bonjou", kb: L("è ò"), watermark: "ò" },
  eo: { name: "Esperanto", flag: "🌐", tts: "eo", ttsFallback: "it-IT", greeting: "Saluton", kb: L("ĉ ĝ ĥ ĵ ŝ ŭ"), watermark: "ĉ" },
  tlh: { name: "tlhIngan Hol", flag: "🖖", tts: "tlh", ttsFallback: "en-US", greeting: "nuqneH", kb: ["'"], watermark: "🖖" },
  nv: { name: "Diné bizaad", flag: "🪶", tts: "nv", ttsFallback: "en-US", greeting: "Yáʼátʼééh", kb: L("á é í ó ą ę į ǫ ł ʼ"), watermark: "ł" },
};
