/*!
 * Interface strings of the app, in the account's base language.
 * fr + en are inline (French = reference, English = fallback for every base
 * language); other languages live in /course/i18n/<code>.js and are loaded on
 * demand with I18N.load(code). Missing keys fall back to English, then French.
 */
(function () {
  var D = {};
  // Base languages that have a full UI translation file in /course/i18n/.
  var AVAILABLE = ["fr", "en", "es", "it", "pt", "de", "nl", "sv", "nb", "da", "fi", "pl", "cs", "ro", "hu", "el", "ru", "uk", "tr", "ar", "he", "hi", "zh", "ja", "ko", "vi", "id", "sw", "ga", "cy", "ht", "eo", "la"];
  var RTL = { ar: 1, he: 1 };

  D.fr = {
    data_title: "Mes données", data_lead: "Tu peux télécharger tout ce que l'application enregistre sur toi, déconnecter tous tes appareils ou supprimer définitivement ton compte.", data_export: "Télécharger mes données", logout_all: "Déconnecter tous les appareils", delete_account: "Supprimer mon compte", delete_lead: "La suppression efface ton compte, ta progression et tes idées. Les factures sont conservées pour la comptabilité, sans lien avec ton compte. Confirme avec ton mot de passe.", delete_pw_ph: "Ton mot de passe", delete_confirm: "Supprimer définitivement ton compte ? Cette action est irréversible.", wrong_password: "Mot de passe incorrect.", email_unverified: "Adresse email non confirmée : clique sur le lien reçu par email.",
    sub_btn: "S'abonner", sub_no_commit: "Sans engagement, annulable à tout moment", sub_no_ads: "Aucune publicité, jamais", sub_canceled: "Paiement annulé.", sub_success: "Paiement reçu, merci ! Ton accès premium est actif.", sub_redirect: "Redirection…", sub_unavailable: "Le paiement n'est pas encore disponible.",
    load_error: "Impossible de charger ce module.", loading: "Chargement…",
    learn_lang: "Apprendre : {lang}", modules: "Modules", go_premium: "Premium", speaking: "Lecture audio…", listen: "Écouter",
    tts_unsupported: "L'audio n'est pas disponible sur ce navigateur.", tts_no_voice: "Aucune voix « {lang} » installée sur cet appareil : l'audio utilise la voix par défaut.", tts_approx: "Voix approchée : aucune voix native n'existe pour cette langue sur cet appareil.",
    gloss_fallback: "Traduction indisponible dans ta langue de base : langue affichée à la place.",
    premium_only: "Réservé à Premium", premium_unlock: "passe à Premium pour le débloquer.", premium_title: "Premium", premium_sub: "Tout ce qu'il faut pour aller jusqu'au bout, dans les 39 langues.", premium_tools: "Outils Premium",
    "feat_levels-c": "Niveaux C1 et C2 (mots, leçons, examens)", "feat_lessons-unlimited": "Leçons illimitées", "feat_srs-advanced": "Révision SRS avancée (SM-2, prévisions, sans limite)", "feat_pronunciation-ai": "Prononciation avec reconnaissance vocale et score", "feat_stats-advanced": "Statistiques avancées", "feat_progress-detailed": "Progression détaillée mot par mot", "feat_certificates": "Certificats de niveau", "feat_badges": "Badges et succès", "feat_offline": "Mode hors-ligne", "feat_custom-words": "Mots personnels illimités", "feat_exam": "Examens blancs par niveau", "feat_export": "Export de la progression (CSV)", "feat_exercices-avances": "Exercices avancés (écrit, dictée, textes à trous, ordre, conjugaison)", "feat_lecons-avancees": "Leçons avancées (B1 et au-delà)", "feat_feedback-avance": "Feedback avancé (explications, analyse des erreurs)",
    mod_hub: "Accueil", mod_vocabulaire: "Vocabulaire", mod_phrases: "Phrases utiles", mod_grammaire: "Grammaire", mod_conjugaison: "Conjugaison", mod_alphabet: "Alphabet", mod_lecture: "Lecture", mod_ecoute: "Compréhension orale", mod_exercices: "Exercices", mod_revision: "Révision", mod_prononciation: "Prononciation", mod_culture: "Culture", mod_examen: "Examens", mod_stats: "Statistiques", mod_badges: "Badges", mod_certificat: "Certificats", mod_dictionnaire: "Dictionnaire", mod_profil: "Profil", mod_levels: "Niveau",
    desc_vocabulaire: "Tous les mots, par thème et par niveau", desc_phrases: "Les phrases du quotidien, avec audio", desc_grammaire: "Les règles essentielles, expliquées", desc_conjugaison: "Tableaux et entraînement", desc_alphabet: "L'écriture, lettre par lettre", desc_lecture: "Textes par niveau, avec questions", desc_ecoute: "Écoute, dictée, textes audio", desc_exercices: "QCM, écrit, trous, ordre des mots…", desc_revision: "Répétition espacée", desc_prononciation: "Écoute et répète", desc_culture: "Usages, histoire, repères", desc_examen: "Teste ton niveau A1 → C2", desc_stats: "Ta progression en chiffres", desc_badges: "Tes succès", desc_certificat: "Certificats imprimables", desc_dictionnaire: "Rechercher et ajouter des mots", desc_profil: "Réglages et audio",
    level: "Niveau", level_A1: "Débutant", level_A2: "Élémentaire", level_B1: "Intermédiaire", level_B2: "Intermédiaire avancé", level_C1: "Avancé", level_C2: "Maîtrise",
    all_levels: "Tous", all_themes: "Tous les thèmes", theme: "Thème", sort: "Trier", filter: "Filtrer", search: "Rechercher…",
    sort_theme: "Par thème", sort_level: "Par niveau", sort_alpha: "A → Z", sort_learn: "À apprendre d'abord",
    only_all: "Tous les mots", only_new: "Jamais vus", only_known: "Déjà sus",
    hub_intro: "Ton parcours en {lang} : vocabulaire, grammaire, lecture, écoute et exercices, du niveau A1 au C2.",
    xp: "points XP", streak_days: "jours de suite", words_known: "mots sus", accuracy: "réussite", answers: "réponses",
    reviews_due: "{n} mots à réviser aujourd'hui", review_now: "Réviser", word_of_day: "Mot du jour", cefr_levels: "Niveaux CECRL", explore: "Explorer",
    n_words: "{n} mots", n_known: "{n} sus", n_shown: "{n} affichés sur {total}", n_texts: "{n} textes", n_questions: "{n} questions",
    vocab_sub: "{n} mots, chacun avec son niveau CECRL. Touche un mot pour voir l'exemple.", show_more: "Afficher plus", no_results: "Aucun résultat.",
    locked_levels: "{n} mots de niveau {levels} sont réservés à Premium.", plural: "Pluriel", mine: "perso", known: "Su", in_review: "En révision", add_review: "Ajouter à la révision", added_review: "Ajouté à la révision", added_n: "{n} mots ajoutés à la révision", my_words: "Mes mots",
    phrases_sub: "Les phrases dont tu as besoin au quotidien, chacune avec l'audio.", grammar_sub: "Les règles de base du {lang}, avec exemples audio.", pronunciation_rules: "Prononciation",
    conj_sub: "Choisis un verbe pour voir ses formes, avec l'audio.", irregular: "irrégulier", practice: "S'entraîner",
    alphabet_sub: "Touche une lettre pour l'entendre et voir un exemple.", sound: "son",
    reading_sub: "Des textes classés par niveau : écoute-les, affiche la traduction, réponds aux questions.", listen_text: "Écouter le texte", show_text: "Afficher le texte", show_translation: "Traduction",
    listening_sub: "Entraîne ton oreille : écoute d'abord, lis ensuite.", listen_texts: "Textes à écouter",
    exercises_sub: "Choisis un niveau, un thème et un type d'exercice.",
    mode_mcq: "QCM", mode_mcq_d: "Choisis la bonne traduction", mode_reverse: "Traduction inverse", mode_reverse_d: "Trouve le mot à partir du sens", mode_listen: "Écoute", mode_listen_d: "Écoute et choisis le sens", mode_write: "Écrit", mode_write_d: "Tape le mot (clavier virtuel)", mode_dictation: "Dictée", mode_dictation_d: "Écris ce que tu entends", mode_cloze: "Textes à trous", mode_cloze_d: "Complète la phrase", mode_order: "Ordre des mots", mode_order_d: "Remets la phrase dans l'ordre", mode_conj: "Conjugaison", mode_conj_d: "Choisis la bonne forme", mode_mix: "Mélange", mode_mix_d: "Un peu de tout",
    quit: "Quitter", check: "Vérifier", continue: "Continuer", correct: "Correct !", wrong: "Pas tout à fait…", answer_was: "Réponse", example: "Exemple", similarity: "Ta réponse est proche à {n} %.", feedback_locked: "Explications détaillées avec le feedback avancé (Premium).",
    quiz_done: "Série terminée", score_line: "{ok}/{total} bonnes réponses ({pct} %) · +{xp} XP", again: "Recommencer", back: "Retour", review_errors: "Tes erreurs", you_said: "ta réponse", reset: "Effacer",
    srs_adv_sub: "Algorithme SM-2 : chaque mot revient juste avant que tu l'oublies.", srs_free_sub: "Répétition espacée par boîtes, {n} révisions par jour.", due_now: "à réviser", in_srs: "en révision", left_today: "restantes aujourd'hui",
    srs_cap_reached: "Limite quotidienne atteinte. Premium : révisions illimitées.", nothing_due: "Rien à réviser pour l'instant.", learn_new: "Ajouter de nouveaux mots", forecast: "Prévisions sur 7 jours", today: "Aujourd'hui",
    review_done: "Révision terminée !", show_answer: "Voir la réponse", grade_again: "À revoir", grade_hard: "Difficile", grade_good: "Bien", grade_easy: "Facile",
    pron_sub_ai: "Écoute, puis enregistre-toi : ta prononciation est comparée au modèle et notée.", pron_sub_free: "Écoute et répète à voix haute.", sr_unsupported: "La reconnaissance vocale n'est pas disponible sur ce navigateur (essaie Chrome ou Safari).", record: "Parler", listening: "Je t'écoute…", heard: "entendu", pron_great: "Excellent !", pron_ok: "Pas mal, encore un essai ?", pron_retry: "Réessaie en articulant.", sr_error: "Micro indisponible",
    culture_sub: "Usages, histoire et repères pour comprendre le monde du {lang}.",
    lesson: "Leçon", lesson_d: "8 nouveaux mots, puis un quiz de 10 questions.", start_lesson: "Commencer la leçon", lessons_left: "{n} leçons gratuites restantes aujourd'hui", lessons_cap: "Tu as fait tes 3 leçons gratuites du jour.", lesson_done: "Leçon terminée !", new_word: "Nouveau mot", words_of_level: "Mots du niveau {level}",
    exam_d: "20 questions. 80 % pour réussir et obtenir le certificat.", exam_best: "Meilleur score : {n} %", take_exam: "Passer l'examen", exam_sub: "Un examen par niveau : 20 questions, réussite à 80 %.", not_taken: "Pas encore passé", exam_passed: "Niveau {level} validé !", exam_failed: "Pas encore : il faut 80 %.", not_enough: "Pas assez de mots à ce niveau.",
    stats_sub: "Ta progression dans cette langue.", activity_30: "Activité (30 jours)", by_level: "Par niveau", by_theme: "Par thème (points faibles d'abord)", hardest_words: "Mots les plus difficiles",
    badges_sub: "{n} badges sur {total}.", earned_on: "obtenu le {d}", badge_new: "Nouveau badge : {name}",
    badge_first: "Premier pas", badge_first_d: "Répondre à une première question", badge_lesson1: "Première leçon", badge_lesson1_d: "Terminer une leçon", badge_lesson10: "Assidu", badge_lesson10_d: "Terminer 10 leçons", badge_words50: "50 mots", badge_words50_d: "Connaître 50 mots", badge_words250: "250 mots", badge_words250_d: "Connaître 250 mots", badge_words1000: "1000 mots", badge_words1000_d: "Connaître 1000 mots", badge_streak3: "Lancé", badge_streak3_d: "3 jours de suite", badge_streak7: "Une semaine", badge_streak7_d: "7 jours de suite", badge_streak30: "Un mois", badge_streak30_d: "30 jours de suite", badge_xp1000: "1000 XP", badge_xp1000_d: "Gagner 1000 XP", badge_perfect: "Sans faute", badge_perfect_d: "Une série parfaite", badge_reviewer: "Mémoire d'éléphant", badge_reviewer_d: "100 mots en révision", badge_examA: "Niveau A", badge_examA_d: "Réussir un examen A1 ou A2", badge_examB: "Niveau B", badge_examB_d: "Réussir un examen B1 ou B2", badge_examC: "Niveau C", badge_examC_d: "Réussir un examen C1 ou C2", badge_speaker: "Orateur", badge_speaker_d: "10 prononciations réussies",
    no_cert: "Pas encore de certificat", no_cert_d: "Réussis un examen de niveau (80 %) pour obtenir ton certificat.", print: "Imprimer", cert_title: "Certificat de réussite", cert_attests: "Ce certificat atteste que", cert_body: "a validé le niveau {level} ({label}) du CECRL en {lang}, avec un score de {score} %.", cert_date: "Délivré le {d}", learner: "Apprenant·e",
    dict_sub: "Cherche un mot, une phrase ou une règle — ou ajoute tes propres mots.", word_in: "Mot en {lang}", romanization: "Prononciation / romanisation", translation: "Traduction", word_required: "Le mot et sa traduction sont obligatoires.",
    profile_sub: "Ta langue de base, l'audio et tes réglages pour cette langue.", base_lang: "Langue de base", change: "Modifier", audio: "Audio", speech_rate: "Vitesse", voice: "Voix", auto: "Automatique", settings: "Réglages", show_rom: "Afficher la prononciation / romanisation", autoplay: "Lecture audio automatique", daily_goal: "Objectif quotidien", danger: "Zone sensible", reset_progress: "Réinitialiser ma progression dans cette langue", reset_confirm: "Effacer toute ta progression dans cette langue ?",
    offline_on: "Mode hors-ligne actif pour cette langue.", offline_preparing: "Préparation du mode hors-ligne…", offline_unsupported: "Le mode hors-ligne n'est pas disponible sur ce navigateur.",
    goal_reached: "Objectif du jour atteint ({n} XP) !", theme_toggle: "Mode clair / sombre",
    // app shell / hub / shell pages
 back_home: "Retour à l'accueil", ideas_title: "Boîte à idées", ideas_lead: "Une idée de langue, une fonctionnalité qui te manque, un bug repéré ? Écris-le ici : chaque message est lu.", ideas_cat: "Catégorie", cat_fonctionnalite: "Fonctionnalité", cat_contenu: "Contenu (mots, leçons, exercices)", cat_langue: "Nouvelle langue", cat_design: "Design", cat_bug: "Bug", cat_autre: "Autre", ideas_label: "Ton idée", ideas_ph: "Ex : ajouter des dialogues audio en coréen…", send: "Envoyer", sending: "Envoi…", ideas_short: "Décris un peu plus ton idée.", ideas_thanks: "Merci ! Ton idée a bien été enregistrée.", send_error: "Impossible d'envoyer pour le moment.", net_error: "Erreur réseau.", ideas_note: "Chaque idée est lue par l'équipe et reçoit un statut (vue, en cours, acceptée ou refusée).",
    profile_title: "Mon profil", profile_lead: "Ton nom et ta langue de base — celle que tu parles déjà. Toute l'application s'y adapte : interface, traductions, explications et parcours.", name_label: "Prénom / nom affiché", name_ph: "Ton prénom", save: "Enregistrer", saving: "Enregistrement…", saved: "Profil enregistré ✓", save_error: "Impossible d'enregistrer pour le moment.", profile_note: "Exemple : langue de base français + langue apprise japonais = interface, traductions des mots et des phrases, et explications en français, contenu en japonais. Les explications de grammaire et de culture sont rédigées en français et en anglais : pour les autres langues de base, la version anglaise est utilisée.",
    app_name: "Mes langues", hub_choose: "Choisis une langue pour commencer", hub_hello: "Bonjour {name} 👋", hub_base: "langue de base : {lang}", admin: "Admin", profile: "Profil", ideas: "Idées", reorder: "Réorganiser", reorder_done: "Terminé", logout: "Se déconnecter", premium_cta: "Toutes les langues sont gratuites — Premium ajoute les niveaux C1/C2, les leçons illimitées, la révision avancée, les certificats et bien plus", all_languages: "Toutes les langues", soon: "Bientôt",
  };

  D.en = {
    data_title: "My data", data_lead: "You can download everything the app stores about you, log out of all your devices or permanently delete your account.", data_export: "Download my data", logout_all: "Log out of all devices", delete_account: "Delete my account", delete_lead: "Deleting erases your account, progress and ideas. Invoices are kept for accounting, no longer linked to your account. Confirm with your password.", delete_pw_ph: "Your password", delete_confirm: "Permanently delete your account? This cannot be undone.", wrong_password: "Wrong password.", email_unverified: "Email address not confirmed: click the link we emailed you.",
    sub_btn: "Subscribe", sub_no_commit: "No commitment, cancel anytime", sub_no_ads: "No ads, ever", sub_canceled: "Payment canceled.", sub_success: "Payment received, thank you! Your Premium access is active.", sub_redirect: "Redirecting…", sub_unavailable: "Payment isn't available yet.",
    load_error: "This module could not be loaded.", loading: "Loading…",
    learn_lang: "Learning: {lang}", modules: "Modules", go_premium: "Premium", speaking: "Playing audio…", listen: "Listen",
    tts_unsupported: "Audio is not available in this browser.", tts_no_voice: "No “{lang}” voice is installed on this device: audio uses the default voice.", tts_approx: "Approximate voice: no native voice exists for this language on this device.",
    gloss_fallback: "No translation in your base language yet: another language is shown instead.",
    premium_only: "Premium only", premium_unlock: "upgrade to Premium to unlock it.", premium_title: "Premium", premium_sub: "Everything you need to go all the way, in all 39 languages.", premium_tools: "Premium tools",
    "feat_levels-c": "C1 and C2 levels (words, lessons, exams)", "feat_lessons-unlimited": "Unlimited lessons", "feat_srs-advanced": "Advanced spaced repetition (SM-2, forecast, no limit)", "feat_pronunciation-ai": "Pronunciation with speech recognition and scoring", "feat_stats-advanced": "Advanced statistics", "feat_progress-detailed": "Word-by-word progress", "feat_certificates": "Level certificates", "feat_badges": "Badges and achievements", "feat_offline": "Offline mode", "feat_custom-words": "Unlimited personal words", "feat_exam": "Practice exams per level", "feat_export": "Progress export (CSV)", "feat_exercices-avances": "Advanced exercises (writing, dictation, gap-fill, word order, conjugation)", "feat_lecons-avancees": "Advanced lessons (B1 and above)", "feat_feedback-avance": "Advanced feedback (explanations, error analysis)",
    mod_hub: "Home", mod_vocabulaire: "Vocabulary", mod_phrases: "Useful phrases", mod_grammaire: "Grammar", mod_conjugaison: "Conjugation", mod_alphabet: "Alphabet", mod_lecture: "Reading", mod_ecoute: "Listening", mod_exercices: "Exercises", mod_revision: "Review", mod_prononciation: "Pronunciation", mod_culture: "Culture", mod_examen: "Exams", mod_stats: "Statistics", mod_badges: "Badges", mod_certificat: "Certificates", mod_dictionnaire: "Dictionary", mod_profil: "Profile", mod_levels: "Level",
    desc_vocabulaire: "Every word, by topic and level", desc_phrases: "Everyday phrases, with audio", desc_grammaire: "The essential rules, explained", desc_conjugaison: "Tables and practice", desc_alphabet: "The script, letter by letter", desc_lecture: "Texts by level, with questions", desc_ecoute: "Listening, dictation, audio texts", desc_exercices: "Quizzes, writing, gap-fill, word order…", desc_revision: "Spaced repetition", desc_prononciation: "Listen and repeat", desc_culture: "Customs, history, landmarks", desc_examen: "Test your level A1 → C2", desc_stats: "Your progress in numbers", desc_badges: "Your achievements", desc_certificat: "Printable certificates", desc_dictionnaire: "Search and add words", desc_profil: "Settings and audio",
    level: "Level", level_A1: "Beginner", level_A2: "Elementary", level_B1: "Intermediate", level_B2: "Upper intermediate", level_C1: "Advanced", level_C2: "Proficiency",
    all_levels: "All", all_themes: "All topics", theme: "Topic", sort: "Sort", filter: "Filter", search: "Search…",
    sort_theme: "By topic", sort_level: "By level", sort_alpha: "A → Z", sort_learn: "To learn first",
    only_all: "All words", only_new: "Never seen", only_known: "Already known",
    hub_intro: "Your {lang} path: vocabulary, grammar, reading, listening and exercises, from A1 to C2.",
    xp: "XP", streak_days: "day streak", words_known: "words known", accuracy: "accuracy", answers: "answers",
    reviews_due: "{n} words to review today", review_now: "Review", word_of_day: "Word of the day", cefr_levels: "CEFR levels", explore: "Explore",
    n_words: "{n} words", n_known: "{n} known", n_shown: "{n} shown of {total}", n_texts: "{n} texts", n_questions: "{n} questions",
    vocab_sub: "{n} words, each with its CEFR level. Tap a word to see an example.", show_more: "Show more", no_results: "No results.",
    locked_levels: "{n} words at level {levels} are Premium only.", plural: "Plural", mine: "mine", known: "Known", in_review: "In review", add_review: "Add to review", added_review: "Added to review", added_n: "{n} words added to review", my_words: "My words",
    phrases_sub: "The phrases you need every day, each with audio.", grammar_sub: "The core rules of {lang}, with audio examples.", pronunciation_rules: "Pronunciation",
    conj_sub: "Pick a verb to see its forms, with audio.", irregular: "irregular", practice: "Practice",
    alphabet_sub: "Tap a letter to hear it and see an example.", sound: "sound",
    reading_sub: "Texts sorted by level: listen, show the translation, answer the questions.", listen_text: "Listen to the text", show_text: "Show text", show_translation: "Translation",
    listening_sub: "Train your ear: listen first, read afterwards.", listen_texts: "Texts to listen to",
    exercises_sub: "Pick a level, a topic and an exercise type.",
    mode_mcq: "Multiple choice", mode_mcq_d: "Choose the right translation", mode_reverse: "Reverse translation", mode_reverse_d: "Find the word from its meaning", mode_listen: "Listening", mode_listen_d: "Listen and choose the meaning", mode_write: "Writing", mode_write_d: "Type the word (virtual keyboard)", mode_dictation: "Dictation", mode_dictation_d: "Write what you hear", mode_cloze: "Gap-fill", mode_cloze_d: "Complete the sentence", mode_order: "Word order", mode_order_d: "Put the sentence back in order", mode_conj: "Conjugation", mode_conj_d: "Choose the right form", mode_mix: "Mix", mode_mix_d: "A bit of everything",
    quit: "Quit", check: "Check", continue: "Continue", correct: "Correct!", wrong: "Not quite…", answer_was: "Answer", example: "Example", similarity: "Your answer is {n}% close.", feedback_locked: "Detailed explanations come with advanced feedback (Premium).",
    quiz_done: "Round complete", score_line: "{ok}/{total} correct ({pct}%) · +{xp} XP", again: "Again", back: "Back", review_errors: "Your mistakes", you_said: "your answer", reset: "Clear",
    srs_adv_sub: "SM-2 algorithm: each word comes back just before you'd forget it.", srs_free_sub: "Box-based spaced repetition, {n} reviews a day.", due_now: "due", in_srs: "in review", left_today: "left today",
    srs_cap_reached: "Daily limit reached. Premium: unlimited reviews.", nothing_due: "Nothing to review right now.", learn_new: "Add new words", forecast: "7-day forecast", today: "Today",
    review_done: "Review complete!", show_answer: "Show answer", grade_again: "Again", grade_hard: "Hard", grade_good: "Good", grade_easy: "Easy",
    pron_sub_ai: "Listen, then record yourself: your pronunciation is compared with the model and scored.", pron_sub_free: "Listen and repeat out loud.", sr_unsupported: "Speech recognition is not available in this browser (try Chrome or Safari).", record: "Speak", listening: "Listening…", heard: "heard", pron_great: "Excellent!", pron_ok: "Not bad, one more try?", pron_retry: "Try again, articulating clearly.", sr_error: "Microphone unavailable",
    culture_sub: "Customs, history and landmarks to understand the {lang}-speaking world.",
    lesson: "Lesson", lesson_d: "8 new words, then a 10-question quiz.", start_lesson: "Start the lesson", lessons_left: "{n} free lessons left today", lessons_cap: "You've done your 3 free lessons today.", lesson_done: "Lesson complete!", new_word: "New word", words_of_level: "{level} words",
    exam_d: "20 questions. 80% to pass and earn the certificate.", exam_best: "Best score: {n}%", take_exam: "Take the exam", exam_sub: "One exam per level: 20 questions, 80% to pass.", not_taken: "Not taken yet", exam_passed: "Level {level} passed!", exam_failed: "Not yet: you need 80%.", not_enough: "Not enough words at this level.",
    stats_sub: "Your progress in this language.", activity_30: "Activity (30 days)", by_level: "By level", by_theme: "By topic (weakest first)", hardest_words: "Hardest words",
    badges_sub: "{n} of {total} badges.", earned_on: "earned on {d}", badge_new: "New badge: {name}",
    badge_first: "First step", badge_first_d: "Answer a first question", badge_lesson1: "First lesson", badge_lesson1_d: "Finish a lesson", badge_lesson10: "Dedicated", badge_lesson10_d: "Finish 10 lessons", badge_words50: "50 words", badge_words50_d: "Know 50 words", badge_words250: "250 words", badge_words250_d: "Know 250 words", badge_words1000: "1,000 words", badge_words1000_d: "Know 1,000 words", badge_streak3: "On a roll", badge_streak3_d: "3 days in a row", badge_streak7: "One week", badge_streak7_d: "7 days in a row", badge_streak30: "One month", badge_streak30_d: "30 days in a row", badge_xp1000: "1,000 XP", badge_xp1000_d: "Earn 1,000 XP", badge_perfect: "Flawless", badge_perfect_d: "A perfect round", badge_reviewer: "Elephant memory", badge_reviewer_d: "100 words in review", badge_examA: "Level A", badge_examA_d: "Pass an A1 or A2 exam", badge_examB: "Level B", badge_examB_d: "Pass a B1 or B2 exam", badge_examC: "Level C", badge_examC_d: "Pass a C1 or C2 exam", badge_speaker: "Speaker", badge_speaker_d: "10 successful pronunciations",
    no_cert: "No certificate yet", no_cert_d: "Pass a level exam (80%) to get your certificate.", print: "Print", cert_title: "Certificate of achievement", cert_attests: "This certifies that", cert_body: "has passed CEFR level {level} ({label}) in {lang}, with a score of {score}%.", cert_date: "Issued on {d}", learner: "Learner",
    dict_sub: "Search for a word, a phrase or a rule — or add your own words.", word_in: "Word in {lang}", romanization: "Pronunciation / romanization", translation: "Translation", word_required: "The word and its translation are required.",
    profile_sub: "Your base language, audio and settings for this language.", base_lang: "Base language", change: "Change", audio: "Audio", speech_rate: "Speed", voice: "Voice", auto: "Automatic", settings: "Settings", show_rom: "Show pronunciation / romanization", autoplay: "Play audio automatically", daily_goal: "Daily goal", danger: "Danger zone", reset_progress: "Reset my progress in this language", reset_confirm: "Erase all your progress in this language?",
    offline_on: "Offline mode is on for this language.", offline_preparing: "Preparing offline mode…", offline_unsupported: "Offline mode is not available in this browser.",
    goal_reached: "Daily goal reached ({n} XP)!", theme_toggle: "Light / dark mode",
 back_home: "Back to home", ideas_title: "Idea box", ideas_lead: "A language idea, a missing feature, a bug? Write it here: every message is read.", ideas_cat: "Category", cat_fonctionnalite: "Feature", cat_contenu: "Content (words, lessons, exercises)", cat_langue: "New language", cat_design: "Design", cat_bug: "Bug", cat_autre: "Other", ideas_label: "Your idea", ideas_ph: "E.g. add audio dialogues in Korean…", send: "Send", sending: "Sending…", ideas_short: "Describe your idea a bit more.", ideas_thanks: "Thanks! Your idea has been saved.", send_error: "Could not send right now.", net_error: "Network error.", ideas_note: "Every idea is read by the team and gets a status (seen, in progress, accepted or declined).",
    profile_title: "My profile", profile_lead: "Your name and your base language — the one you already speak. The whole app adapts to it: interface, translations, explanations and learning path.", name_label: "Display name", name_ph: "Your first name", save: "Save", saving: "Saving…", saved: "Profile saved ✓", save_error: "Could not save right now.", profile_note: "Example: base language English + learning Japanese = interface, word and phrase translations and explanations in English, content in Japanese. Grammar and culture explanations are written in French and English: other base languages get the English version.",
    app_name: "Mes langues", hub_choose: "Pick a language to get started", hub_hello: "Hi {name} 👋", hub_base: "base language: {lang}", admin: "Admin", profile: "Profile", ideas: "Ideas", reorder: "Reorder", reorder_done: "Done", logout: "Log out", premium_cta: "Every language is free — Premium adds C1/C2 levels, unlimited lessons, advanced review, certificates and much more", all_languages: "All languages", soon: "Soon",
  };

  function resolve(code) { return AVAILABLE.indexOf(code) >= 0 ? code : "en"; }
  function t(base, key, vars) {
    var s = (D[base] && D[base][key]) || (D.en && D.en[key]) || (D.fr && D.fr[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  var loading = {};
  // Base languages that ship a full interface dictionary (/course/i18n/<code>.js).
  // Other base languages keep their word translations but the interface falls back to English.
  var DICTS = ["es", "it", "pt", "de", "nl", "ru", "ar", "he", "zh", "ja", "ko", "tr", "pl"];
  function load(code) {
    code = resolve(code);
    if (D[code]) return Promise.resolve(code);
    if (DICTS.indexOf(code) < 0) return Promise.resolve("en");
    if (!loading[code]) {
      loading[code] = new Promise(function (res) {
        var s = document.createElement("script");
        s.src = "/course/i18n/" + code + ".js";
        s.onload = function () { res(code); }; s.onerror = function () { res("en"); };
        document.head.appendChild(s);
      });
    }
    return loading[code];
  }
  window.I18N = {
    t: t, resolve: resolve, load: load, rtl: function (c) { return !!RTL[c]; },
    add: function (code, dict) { D[code] = dict; },
    available: AVAILABLE,
    dicts: DICTS,
    // [data-i18n="key"] -> textContent, [data-i18n-ph="key"] -> placeholder
    apply: function (base, root) {
      (root || document).querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(base, el.getAttribute("data-i18n")); });
      (root || document).querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(base, el.getAttribute("data-i18n-ph"))); });
    },
  };
})();
