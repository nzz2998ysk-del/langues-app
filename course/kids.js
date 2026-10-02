/*!
 * Pap’pote — content of the children's mode (loaded before engine.js).
 *
 * WORDS: concrete concepts of the shared vocabulary (content/vocab/*.txt), with
 * a picture (emoji) and the word in the child's own language (fr / en). The
 * word in the language being learned comes from the course itself (concept id
 * = word.cid or word.id "c-<cid>"), so every one of the 39 courses works.
 *
 * STORIES: told in the child's language; {cid} slots show the word in the
 * language being learned, in a bubble the child taps to hear it. A story is
 * offered only when the course has most of its words.
 */
(function () {
  "use strict";
  // [cid, emoji, fr, en, category]
  var W = [
    // animals
    ["dog", "🐶", "chien", "dog", "animals"], ["cat", "🐱", "chat", "cat", "animals"], ["bird", "🐦", "oiseau", "bird", "animals"],
    ["fish_animal", "🐟", "poisson", "fish", "animals"], ["horse", "🐴", "cheval", "horse", "animals"], ["cow", "🐮", "vache", "cow", "animals"],
    ["sheep", "🐑", "mouton", "sheep", "animals"], ["pig", "🐷", "cochon", "pig", "animals"], ["lion", "🦁", "lion", "lion", "animals"],
    ["elephant", "🐘", "éléphant", "elephant", "animals"], ["bear", "🐻", "ours", "bear", "animals"], ["snake", "🐍", "serpent", "snake", "animals"],
    ["dragon", "🐉", "dragon", "dragon", "animals"], ["insect", "🐞", "insecte", "insect", "animals"],
    // colours
    ["red", "🔴", "rouge", "red", "colours"], ["blue", "🔵", "bleu", "blue", "colours"], ["green", "🟢", "vert", "green", "colours"],
    ["yellow", "🟡", "jaune", "yellow", "colours"], ["black", "⚫", "noir", "black", "colours"], ["white", "⚪", "blanc", "white", "colours"],
    ["orange_color", "🟠", "orange", "orange", "colours"], ["pink", "🩷", "rose", "pink", "colours"], ["purple", "🟣", "violet", "purple", "colours"],
    ["brown", "🟤", "marron", "brown", "colours"],
    // numbers
    ["one", "1️⃣", "un", "one", "numbers"], ["two", "2️⃣", "deux", "two", "numbers"], ["three", "3️⃣", "trois", "three", "numbers"],
    ["four", "4️⃣", "quatre", "four", "numbers"], ["five", "5️⃣", "cinq", "five", "numbers"], ["six", "6️⃣", "six", "six", "numbers"],
    ["seven", "7️⃣", "sept", "seven", "numbers"], ["eight", "8️⃣", "huit", "eight", "numbers"], ["nine", "9️⃣", "neuf", "nine", "numbers"],
    ["ten", "🔟", "dix", "ten", "numbers"],
    // food
    ["apple", "🍎", "pomme", "apple", "food"], ["banana", "🍌", "banane", "banana", "food"], ["bread", "🍞", "pain", "bread", "food"],
    ["milk", "🥛", "lait", "milk", "food"], ["water", "💧", "eau", "water", "food"], ["egg", "🥚", "œuf", "egg", "food"],
    ["cheese", "🧀", "fromage", "cheese", "food"], ["juice", "🧃", "jus", "juice", "food"], ["fruit", "🍇", "fruit", "fruit", "food"],
    ["vegetable", "🥕", "légume", "vegetable", "food"], ["rice", "🍚", "riz", "rice", "food"], ["soup", "🍲", "soupe", "soup", "food"],
    ["chicken", "🍗", "poulet", "chicken", "food"], ["sugar", "🍬", "sucre", "sugar", "food"],
    // family & people
    ["mother", "👩", "maman", "mum", "family"], ["father", "👨", "papa", "dad", "family"], ["brother", "👦", "frère", "brother", "family"],
    ["sister", "👧", "sœur", "sister", "family"], ["grandmother", "👵", "grand-mère", "grandma", "family"], ["grandfather", "👴", "grand-père", "grandpa", "family"],
    ["baby", "👶", "bébé", "baby", "family"], ["friend", "🧑‍🤝‍🧑", "ami", "friend", "family"], ["family", "👨‍👩‍👧", "famille", "family", "family"],
    ["boy", "🧒", "garçon", "boy", "family"], ["girl", "👧", "fille", "girl", "family"], ["teacher", "🧑‍🏫", "maîtresse", "teacher", "family"],
    // body
    ["head", "🙂", "tête", "head", "body"], ["eye", "👁️", "œil", "eye", "body"], ["ear", "👂", "oreille", "ear", "body"],
    ["mouth", "👄", "bouche", "mouth", "body"], ["nose", "👃", "nez", "nose", "body"], ["hand", "✋", "main", "hand", "body"],
    ["foot", "🦶", "pied", "foot", "body"], ["hair", "💇", "cheveux", "hair", "body"], ["tooth", "🦷", "dent", "tooth", "body"],
    ["heart", "❤️", "cœur", "heart", "body"], ["arm", "💪", "bras", "arm", "body"], ["leg", "🦵", "jambe", "leg", "body"],
    // nature
    ["sun", "☀️", "soleil", "sun", "nature"], ["moon", "🌙", "lune", "moon", "nature"], ["star", "⭐", "étoile", "star", "nature"],
    ["sky", "🌌", "ciel", "sky", "nature"], ["rain", "🌧️", "pluie", "rain", "nature"], ["snow", "❄️", "neige", "snow", "nature"],
    ["tree", "🌳", "arbre", "tree", "nature"], ["flower", "🌸", "fleur", "flower", "nature"], ["sea", "🌊", "mer", "sea", "nature"],
    ["river", "🏞️", "rivière", "river", "nature"], ["mountain", "⛰️", "montagne", "mountain", "nature"], ["forest", "🌲", "forêt", "forest", "nature"],
    ["beach", "🏖️", "plage", "beach", "nature"], ["cloud", "☁️", "nuage", "cloud", "nature"], ["fire", "🔥", "feu", "fire", "nature"],
    ["wind", "🌬️", "vent", "wind", "nature"],
    // home & things
    ["house", "🏠", "maison", "house", "home"], ["door", "🚪", "porte", "door", "home"], ["window", "🪟", "fenêtre", "window", "home"],
    ["bed", "🛏️", "lit", "bed", "home"], ["table", "🍽️", "table", "table", "home"], ["chair", "🪑", "chaise", "chair", "home"],
    ["garden", "🏡", "jardin", "garden", "home"], ["key", "🔑", "clé", "key", "home"], ["book", "📖", "livre", "book", "home"],
    ["pen", "🖊️", "stylo", "pen", "home"], ["school", "🏫", "école", "school", "home"], ["game", "🎲", "jeu", "game", "home"],
    ["music", "🎵", "musique", "music", "home"], ["song", "🎤", "chanson", "song", "home"], ["party", "🎉", "fête", "party", "home"],
    // clothes
    ["hat", "🎩", "chapeau", "hat", "clothes"], ["shoes", "👟", "chaussures", "shoes", "clothes"], ["dress", "👗", "robe", "dress", "clothes"],
    ["coat", "🧥", "manteau", "coat", "clothes"], ["shirt", "👕", "chemise", "shirt", "clothes"], ["trousers", "👖", "pantalon", "trousers", "clothes"],
    ["bag", "🎒", "sac", "bag", "clothes"],
    // transport
    ["car", "🚗", "voiture", "car", "transport"], ["bus", "🚌", "bus", "bus", "transport"], ["train", "🚂", "train", "train", "transport"],
    ["plane", "✈️", "avion", "plane", "transport"], ["bicycle", "🚲", "vélo", "bike", "transport"],
    // words to say
    ["hello", "👋", "bonjour", "hello", "words"], ["goodbye", "👋", "au revoir", "goodbye", "words"], ["thank_you", "🙏", "merci", "thank you", "words"],
    ["please", "🥺", "s'il te plaît", "please", "words"], ["yes", "👍", "oui", "yes", "words"], ["no", "👎", "non", "no", "words"],
    ["good_night", "🌜", "bonne nuit", "good night", "words"], ["sorry", "😔", "pardon", "sorry", "words"],
    // feelings & sizes
    ["happy", "😄", "content", "happy", "feelings"], ["sad", "😢", "triste", "sad", "feelings"], ["tired", "😴", "fatigué", "tired", "feelings"],
    ["big", "🐘", "grand", "big", "feelings"], ["small", "🐭", "petit", "small", "feelings"], ["hot", "🥵", "chaud", "hot", "feelings"],
    ["cold", "🥶", "froid", "cold", "feelings"], ["afraid", "😨", "peur", "scared", "feelings"], ["hungry", "😋", "faim", "hungry", "feelings"],
    // actions
    ["eat", "🍽️", "manger", "eat", "actions"], ["drink", "🥤", "boire", "drink", "actions"], ["sleep", "😴", "dormir", "sleep", "actions"],
    ["play", "🤸", "jouer", "play", "actions"], ["run", "🏃", "courir", "run", "actions"], ["sing", "🎶", "chanter", "sing", "actions"],
    ["read", "📚", "lire", "read", "actions"], ["walk", "🚶", "marcher", "walk", "actions"],
  ];
  var CATEGORIES = [
    ["animals", "🐾", "Les animaux", "Animals"], ["colours", "🎨", "Les couleurs", "Colours"], ["numbers", "🔢", "Les nombres", "Numbers"],
    ["food", "🍎", "Miam !", "Yummy!"], ["family", "👨‍👩‍👧", "La famille", "Family"], ["body", "🙂", "Mon corps", "My body"],
    ["nature", "🌳", "La nature", "Nature"], ["home", "🏠", "À la maison", "At home"], ["clothes", "👕", "Les habits", "Clothes"],
    ["transport", "🚗", "Les transports", "Getting around"], ["words", "👋", "Les mots magiques", "Magic words"],
    ["feelings", "😄", "Comment je me sens", "How I feel"], ["actions", "🤸", "Je bouge !", "Let's move!"],
  ];

  // Stories: pages = [scene emojis, French text, English text]. {cid} = the word
  // in the language being learned. quiz = words asked at the end.
  var STORIES = [
    {
      id: "lost-cat", cover: "🐱", color: "#ff9f0a",
      title: ["Le chat perdu", "The lost cat"],
      pages: [
        ["🏠☀️", "Ce matin, le soleil brille sur la petite maison de Lili. Le {sun} est tout jaune !", "This morning the sun shines on Lili's little house. The {sun} is all yellow!"],
        ["🐱❓", "Oh non ! Minou, le {cat} de Lili, a disparu. Où est-il ?", "Oh no! Minou, Lili's {cat}, is missing. Where can he be?"],
        ["🌳🐦", "Sous le grand {tree}, un petit {bird} chante : « Cui-cui ! Je ne l'ai pas vu. »", "Under the big {tree}, a little {bird} sings: “Tweet! I haven't seen him.”"],
        ["🐶💬", "Le {dog} du voisin aboie : « Ouaf ! Il est parti vers la rivière ! »", "The neighbour's {dog} barks: “Woof! He went to the river!”"],
        ["🏞️🐟", "Dans la rivière, un {fish_animal} fait des bulles. Pas de chat ici…", "In the river, a {fish_animal} blows bubbles. No cat here…"],
        ["🌸😺", "Enfin ! Minou dort au milieu des {flower}s. Lili lui fait un gros câlin. Fin !", "At last! Minou is asleep among the {flower}s. Lili gives him a big hug. The end!"],
      ],
      quiz: ["cat", "dog", "tree", "bird", "flower"],
    },
    {
      id: "farm", cover: "🐮", color: "#34c759",
      title: ["La ferme de grand-mère", "Grandma's farm"],
      pages: [
        ["👵🏡", "Aujourd'hui, Tom rend visite à sa {grandmother} à la ferme.", "Today Tom visits his {grandmother} on the farm."],
        ["🐮🥛", "La {cow} dit « Meuh ! ». Elle donne du bon {milk} blanc.", "The {cow} says “Moo!”. She gives good white {milk}."],
        ["🐷💦", "Le {pig} rose se roule dans la boue. Splash !", "The pink {pig} rolls in the mud. Splash!"],
        ["🐑☁️", "Le {sheep} est tout doux, comme un nuage.", "The {sheep} is soft, just like a cloud."],
        ["🐔🥚", "Dans le poulailler, Tom trouve un {egg} tout chaud !", "In the henhouse, Tom finds a warm {egg}!"],
        ["🐴🍎", "Pour finir, Tom donne une {apple} au {horse}. Croc ! Merci, Tom !", "To finish, Tom gives an {apple} to the {horse}. Crunch! Thank you, Tom!"],
      ],
      quiz: ["cow", "pig", "sheep", "egg", "horse"],
    },
    {
      id: "rainbow", cover: "🌈", color: "#af52de",
      title: ["Les couleurs de l'arc-en-ciel", "The rainbow's colours"],
      pages: [
        ["🌧️☂️", "Plic, ploc… La {rain} tombe sur le jardin.", "Drip, drop… The {rain} falls on the garden."],
        ["☀️🌈", "Puis le {sun} revient. Regarde : un arc-en-ciel dans le {sky} !", "Then the {sun} comes back. Look: a rainbow in the {sky}!"],
        ["🔴🍓", "Il y a du {red}, comme les fraises.", "There is {red}, like strawberries."],
        ["🟡🍋", "Il y a du {yellow}, comme le citron.", "There is {yellow}, like a lemon."],
        ["🟢🐸", "Il y a du {green}, comme la grenouille.", "There is {green}, like a frog."],
        ["🔵🌊", "Et du {blue}, comme la mer. Quel bel arc-en-ciel ! Fin !", "And {blue}, like the sea. What a beautiful rainbow! The end!"],
      ],
      quiz: ["red", "yellow", "green", "blue", "rain"],
    },
    {
      id: "picnic", cover: "🧺", color: "#ff375f",
      title: ["Le grand pique-nique", "The big picnic"],
      pages: [
        ["🧺🌳", "C'est l'heure du pique-nique ! Zoé et son {friend} s'installent sous un arbre.", "It's picnic time! Zoé and her {friend} sit under a tree."],
        ["1️⃣🍞", "Zoé sort {one} gros {bread}.", "Zoé takes out {one} big {bread}."],
        ["2️⃣🍌", "Puis {two} {banana}s bien jaunes.", "Then {two} nice yellow {banana}s."],
        ["3️⃣🍎", "Et {three} {apple}s rouges. Miam !", "And {three} red {apple}s. Yummy!"],
        ["🧀🧃", "Il y a aussi du {cheese} et du {juice} d'orange.", "There's also {cheese} and orange {juice}."],
        ["😄🎉", "Tout le monde a bien mangé. « {thank_you}, Zoé ! » Fin !", "Everyone has eaten well. “{thank_you}, Zoé!” The end!"],
      ],
      quiz: ["bread", "banana", "apple", "cheese", "three"],
    },
    {
      id: "seaside", cover: "🏖️", color: "#0a84ff",
      title: ["Une journée à la mer", "A day at the sea"],
      pages: [
        ["🚗💨", "Toute la famille monte dans la {car}. En route pour la mer !", "The whole family gets in the {car}. Off to the sea!"],
        ["🏖️☀️", "Voici la {beach}. Il fait chaud, papa met son {hat}.", "Here is the {beach}. It's hot, so Dad puts on his {hat}."],
        ["🌊🐟", "Dans la {sea}, Léo voit un petit {fish_animal} orange.", "In the {sea}, Léo sees a little orange {fish_animal}."],
        ["🏰👧", "Sa {sister} construit un château de sable avec ses mains.", "His {sister} builds a sandcastle with her hands."],
        ["🍦😋", "Maman achète des glaces. Tout le monde est {happy} !", "Mum buys ice creams. Everyone is {happy}!"],
        ["🌅🚗", "Le soir, on rentre à la maison. « {goodbye}, la mer ! » Fin !", "In the evening, we drive home. “{goodbye}, sea!” The end!"],
      ],
      quiz: ["car", "beach", "sea", "fish_animal", "hat"],
    },
    {
      id: "good-night", cover: "🌙", color: "#5e5ce6",
      title: ["Bonne nuit, petit ours", "Good night, little bear"],
      pages: [
        ["🐻🏠", "Petit {bear} rentre à la maison après une longue journée.", "Little {bear} comes home after a long day."],
        ["👩🍲", "Sa {mother} a préparé une bonne {soup}. Il a très faim !", "His {mother} has made a nice {soup}. He's very hungry!"],
        ["🛁😴", "Après le bain, Petit Ours est tout {tired}.", "After his bath, Little Bear is very {tired}."],
        ["📖👨", "Son {father} lui lit un {book} plein d'aventures.", "His {father} reads him a {book} full of adventures."],
        ["🌙⭐", "Par la fenêtre, il voit la {moon} et une {star} qui brille.", "Through the window he sees the {moon} and a shining {star}."],
        ["🛏️💤", "Petit Ours se blottit dans son {bed}. « {good_night} ! » Fin !", "Little Bear snuggles up in his {bed}. “{good_night}!” The end!"],
      ],
      quiz: ["bear", "mother", "book", "moon", "bed"],
    },
  ];
  // Stickers earned with stars (one every 5 stars), in this order.
  var STICKERS = ["🦄", "🐼", "🦊", "🐸", "🐙", "🦋", "🐢", "🦖", "🐬", "🦉", "🐝", "🦒", "🐧", "🦜", "🐳", "🦔", "🐞", "🦩", "🐿️", "🌈", "🚀", "🏆", "👑", "💎"];

  window.PAPOTE_KIDS = { WORDS: W, CATEGORIES: CATEGORIES, STORIES: STORIES, STICKERS: STICKERS };
})();
