const { g, verb, ex, q, G, R, C } = require("./_helpers");
const P = ["mé", "tú", "sé / sí", "muid / -imid", "sibh", "siad"];
const V = (t, gl, lvl, f, o) => verb(P, t, gl, lvl, f, o);
module.exports = {
  replace: ["grammar", "readings"],
  note: g("Irlandais (Gaeilge), langue celtique. L'orthographe est ancienne : bh = v/w, mh = v/w, ch = kh, dh/gh souvent muets. L'audio peut être approximatif selon les appareils.", "Irish (Gaeilge), a Celtic language. Spelling is old: bh = v/w, mh = v/w, ch = kh, dh/gh often silent. Audio may be approximate depending on the device."),
  grammar: [
    G("ga-vso", "A1", "➡️", ["Verbe – sujet – objet", "Verb – subject – object"], ["<p>Le verbe vient en premier : <i>Ólann sé tae</i> (il boit du thé, littéralement « boit il thé »).</p>", "<p>The verb comes first: <i>Ólann sé tae</i> (he drinks tea, literally 'drinks he tea').</p>"], [ex("Tá mé go maith.", "", "Je vais bien.", "I'm well.")]),
    G("ga-mutations", "A2", "🔀", ["Les mutations initiales", "Initial mutations"], ["<p>La première consonne change selon le contexte. Lénition (ajout d'un h) : <i>bád → mo bhád</i> (mon bateau). Éclipse : <i>bád → ár mbád</i> (notre bateau).</p>", "<p>The first consonant changes by context. Lenition (adds h): <i>bád → mo bhád</i> (my boat). Eclipsis: <i>bád → ár mbád</i> (our boat).</p>"], [ex("Is é seo mo theach.", "", "C'est ma maison.", "This is my house.")]),
    G("ga-oui", "A1", "🙊", ["Pas de mot pour « oui »", "No word for 'yes'"], ["<p>On répond en répétant le verbe : <i>An bhfuil tú tuirseach? — Tá.</i> (Es-tu fatigué ? — Je le suis.) / <i>Níl.</i> (Non.)</p>", "<p>You answer by repeating the verb: <i>An bhfuil tú tuirseach? — Tá.</i> (Are you tired? — I am.) / <i>Níl.</i> (I'm not.)</p>"], [ex("An bhfuil Gaeilge agat? — Tá, beagán.", "", "Parles-tu irlandais ? — Oui, un peu.", "Do you speak Irish? — Yes, a little.")]),
    G("ga-agam", "A1", "🔑", ["Avoir = « chez moi »", "Having = 'at me'"], ["<p><i>Tá carr agam</i> : « une voiture est chez moi » = j'ai une voiture. <i>agam, agat, aige, aici, againn, agaibh, acu</i>.</p>", "<p><i>Tá carr agam</i>: 'a car is at me' = I have a car. <i>agam, agat, aige, aici, againn, agaibh, acu</i>.</p>"], [ex("Tá deartháir agam.", "", "J'ai un frère.", "I have a brother.")]),
  ],
  conj: {
    tenses: [{ id: "present", fr: "Présent", en: "Present" }, { id: "passe", fr: "Passé", en: "Past" }, { id: "futur", fr: "Futur", en: "Future" }],
    verbs: [
      V("bí", g("être", "to be"), "A1", { present: ["tá mé", "tá tú", "tá sé", "táimid", "tá sibh", "tá siad"], passe: ["bhí mé", "bhí tú", "bhí sé", "bhíomar", "bhí sibh", "bhí siad"], futur: ["beidh mé", "beidh tú", "beidh sé", "beimid", "beidh sibh", "beidh siad"] }, { irregular: true }),
      V("ól", g("boire", "to drink"), "A1", { present: ["ólaim", "ólann tú", "ólann sé", "ólaimid", "ólann sibh", "ólann siad"], passe: ["d'ól mé", "d'ól tú", "d'ól sé", "d'ólamar", "d'ól sibh", "d'ól siad"] }),
    ],
  },
  readings: [
    R("ga-r1", "A1", "Mé féin", "Dia duit! Is mise Siobhán. Tá mé i mo chónaí i nGaillimh. Tá deartháir agus deirfiúr agam. Is maith liom ceol agus damhsa.", "", ["Bonjour ! Je suis Siobhán. J'habite à Galway. J'ai un frère et une sœur. J'aime la musique et la danse.", "Hello! I'm Siobhán. I live in Galway. I have a brother and a sister. I like music and dancing."],
      [q("Où habite Siobhán ?", "Where does Siobhán live?", [["À Galway", "In Galway"], ["À Dublin", "In Dublin"], ["À Cork", "In Cork"]], 0)]),
  ],
  culture: [
    C("ga-c1", "A1", "🗺️", ["La Gaeltacht", "The Gaeltacht"], ["<p>Régions (surtout dans l'ouest) où l'irlandais reste la langue de la vie quotidienne.</p>", "<p>Regions (mostly in the west) where Irish is still the everyday language.</p>"]),
    C("ga-c2", "A2", "🎻", ["La musique trad", "Trad music"], ["<p>Les <i>seisiúin</i> réunissent musiciens (violon, flûte, bodhrán) dans les pubs.</p>", "<p><i>Seisiúin</i> bring musicians (fiddle, flute, bodhrán) together in pubs.</p>"]),
    C("ga-c3", "B1", "☘️", ["Seachtain na Gaeilge", "Seachtain na Gaeilge"], ["<p>Festival de la langue irlandaise autour de la Saint-Patrick (17 mars).</p>", "<p>A festival of the Irish language around St Patrick's Day (17 March).</p>"]),
  ],
};
