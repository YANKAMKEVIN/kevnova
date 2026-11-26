#!/usr/bin/env python3
"""Kevnova : écrit les prompts d'images (lus par generer.sh)."""
import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prompts")
os.makedirs(D, exist_ok=True)

ADN = """PROJET : « KEVNOVA », jeu vidéo ORIGINAL de shoot'em up vertical (bullet hell) en 2D. Lyse, une pilote de 17 ans, et Pilou, son petit drone-lanterne, volent à bord de l'« Étincelle » pour rallumer Astrée, la dernière étoile, que la Flotte Éteignoir de l'Archonte Cendre est en train d'aspirer. Cinq secteurs : la Nébuleuse Corail, les Anneaux de Givre, la Forge Écarlate, l'Abysse Lumineuse et la Couronne Éteinte. Œuvre ORIGINALE : ne reprends aucun vaisseau, personnage, logo, style signature ni élément d'un jeu, film, manga ou dessin animé existant.

STYLE VERROUILLÉ (identique pour toutes les images du jeu) : illustration numérique peinte haut de gamme de jeu vidéo commercial, style « émail céleste » : les vaisseaux des héros ont des coques en céramique blanc nacré incrustées d'émail coloré et de fins filets d'or, avec des cœurs d'énergie lumineux ; les machines ennemies de la Flotte Éteignoir sont en métal obsidienne noir bleuté, anguleuses et élégantes, parcourues de veines de lumière magenta et violette, avec des yeux-capteurs ambrés. Formes très lisibles, silhouettes fortes, contours nets, volumes peints doux avec reflets spéculaires, lueurs (glow) saturées. Palette maîtresse : nuit profonde #0b0f2a, indigo #1d1b4f, cyan héroïque #4fe3ff, blanc nacré #f4f1ff, or #ffcf5a ; ennemis : magenta #ff3d7f, violet #8a3dff, braise #ff7a2e. Ambiance : space opera merveilleux, lumineux et épique. Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucune signature, aucun filigrane."""

T = "Fond avec une VRAIE TRANSPARENCE (canal alpha) : aucun décor, aucun ciel, aucune étoile, aucune ombre portée. Le sujet SEUL, entièrement visible avec une petite marge, centré. Format carré."
DESSUS_HAUT = "Vue STRICTEMENT DE DESSUS (plongée verticale à 90°, comme dans un shoot'em up vertical), parfaitement symétrique gauche-droite, le NEZ du vaisseau pointe vers le HAUT de l'image."
DESSUS_BAS = "Vue STRICTEMENT DE DESSUS (plongée verticale à 90°, comme dans un shoot'em up vertical), symétrique gauche-droite, l'AVANT (armes, capteurs) pointe vers le BAS de l'image."


def w(name, txt):
    with open(os.path.join(D, name + ".txt"), "w") as f:
        f.write(txt.strip() + "\n")


w("_ADN", ADN)

# --- Vaisseaux du joueur ---
JOUEUR = {
    "ship_etincelle": "VAISSEAU DU JOUEUR « Étincelle » : petit chasseur élégant en céramique blanc nacré avec émail CYAN, deux ailes en flèche fines comme des ailes d'hirondelle, filets d'or, un cœur d'énergie cyan brillant au centre, deux petits réacteurs à l'arrière avec flammes cyan courtes. Équilibré et rapide.",
    "ship_lance": "VAISSEAU DU JOUEUR « Lance » : chasseur long et effilé en céramique blanc nacré avec émail OR et ambre, un long canon central en forme d'aiguille, ailes courtes repliées vers l'arrière, cœur d'énergie doré, un réacteur central puissant à flamme dorée. Précis et perçant.",
    "ship_gerbe": "VAISSEAU DU JOUEUR « Gerbe » : chasseur large en forme d'éventail ou de fleur, céramique blanc nacré avec émail ROSE corail, cinq petits canons répartis en arc sur l'avant, cœur d'énergie rose, deux réacteurs à flammes roses. Puissant et couvrant.",
}
for k, p in JOUEUR.items():
    w(k, f"SPRITE DE JEU : {p}\n{DESSUS_HAUT}\n{T}")

w("drone_pilou", f"SPRITE DE JEU : « Pilou », petit drone-satellite compagnon en forme de lanterne ronde de céramique blanche et d'or, avec un œil-lumière cyan doux et deux petites ailettes. Mignon et lisible. Vue de dessus. {T}")

# --- Ennemis ---
ENNEMIS = {
    "e_dard": "petit chasseur ennemi « Dard » en forme de pointe de flèche, obsidienne et veines magenta, un œil ambré, très petit et nerveux.",
    "e_toupie": "drone ennemi « Toupie » en forme de disque rond à lames tournantes, obsidienne, anneau de lumière violette, œil central ambré.",
    "e_mante": "vaisseau ennemi moyen « Mante », silhouette d'insecte mante religieuse mécanique, deux longues pinces-canons vers l'avant, obsidienne et magenta.",
    "e_cuirasse": "vaisseau ennemi lourd « Cuirasse », large et blindé comme une carapace de scarabée, plaques d'obsidienne, deux tourelles, fentes de lumière braise orangée.",
    "e_meduse": "drone ennemi « Méduse », cloche translucide violette lumineuse avec un noyau mécanique d'obsidienne et des tentacules de lumière magenta qui pendent vers le bas.",
    "e_eclat": "drone ennemi « Éclat », cristal de glace bleu pâle taillé en losange, monté dans une armature d'obsidienne, cœur magenta. Pour le secteur des Anneaux de Givre.",
    "e_porteur": "grand vaisseau-porteur ennemi « Porteur », allongé, coque d'obsidienne, hangar lumineux magenta au centre, nombreux petits feux de position ambrés. Mini-boss.",
    "e_tourelle": "tourelle ennemie flottante « Sentinelle », hexagone d'obsidienne avec un canon rotatif central et une lentille ambrée, anneau de lumière violette.",
}
for k, p in ENNEMIS.items():
    w(k, f"SPRITE DE JEU : {p}\n{DESSUS_BAS}\n{T}")

# --- Boss ---
BOSS = {
    "boss_faucheur": "BOSS « Le Faucheur Corail », énorme vaisseau-moissonneur ennemi en forme de crabe mécanique, deux grandes pinces-faux sur les côtés, carapace d'obsidienne incrustée de coraux roses luminescents qu'il a arrachés, cœur magenta central, nombreux canons.",
    "boss_sentinelle": "BOSS « La Sentinelle de Givre », forteresse volante ennemie hexagonale hérissée de grands cristaux de glace bleu pâle, armature d'obsidienne, un œil central ambré géant, quatre bras-canons en croix.",
    "boss_fondeur": "BOSS « Le Grand Fondeur », colossal vaisseau-forge ennemi massif et industriel, creusets de métal en fusion orange braise, cheminées, plaques d'obsidienne rivetées, deux bras-marteaux, grille de lumière braise.",
    "boss_leviathan": "BOSS « Le Léviathan Nacré », immense vaisseau-créature ennemi en forme de raie manta mécanique, ailes d'obsidienne bordées de lumière violette bioluminescente, motifs nacrés, longue queue, gueule lumineuse magenta.",
    "boss_archonte": "BOSS FINAL « L'Archonte Cendre », gigantesque vaisseau-couronne ennemi en forme de soleil noir : un anneau d'obsidienne couronné de flèches dorées ternies, au centre un noyau de lumière violette et magenta qui aspire la lumière, ailes déployées en éventail, majestueux et terrifiant.",
}
for k, p in BOSS.items():
    w(k, f"SPRITE DE JEU : {p}\n{DESSUS_BAS}\n{T}")

# --- Décors (défilement vertical) ---
FOND = ("DÉCOR DE FOND pour shoot'em up vertical, format PORTRAIT (2:3, vertical), vue plongeante de dessus sur l'espace, SANS horizon, SANS planète coupée en bas, "
        "composition répartie uniformément sur toute la hauteur pour un défilement vertical continu, pas de point focal fort au centre. Sans vaisseau, sans personnage, sans texte. "
        "Couleurs assez sombres et douces pour que les tirs lumineux restent très lisibles par-dessus.")
FONDS = {
    "fond_corail": "La Nébuleuse Corail : nuages de gaz rose corail, pêche et violet, filaments lumineux comme des coraux, petites étoiles, poussière dorée.",
    "fond_givre": "Les Anneaux de Givre : champ d'anneaux de glace et de fragments de cristal bleu pâle vus de dessus, brume bleu glacier, reflets cyan, fond indigo profond.",
    "fond_forge": "La Forge Écarlate : immense surface industrielle d'une station-forge vue de dessus, plaques de métal sombre, rivières de métal en fusion orange, grilles et conduits, fumées rougeoyantes.",
    "fond_abysse": "L'Abysse Lumineuse : vide profond bleu-noir peuplé de plantes et d'algues spatiales bioluminescentes turquoise et violettes, spores lumineuses, méduses lointaines.",
    "fond_couronne": "La Couronne Éteinte : espace sombre violet-noir autour d'une étoile mourante, débris d'obsidienne en orbite, filaments de lumière aspirés vers un centre invisible hors champ, braises dorées.",
}
for k, p in FONDS.items():
    w(k, f"{FOND} {p}")

# --- Décors flottants (parallaxe) ---
DECO = {
    "deco_asteroide": "un astéroïde rocheux sombre aux arêtes nettes avec des veines de cristal rose, vu de dessus.",
    "deco_glace": "un gros fragment de glace et de cristal bleu pâle flottant, vu de dessus.",
    "deco_epave": "une épave de vaisseau ennemi d'obsidienne brisée, fumante, avec une lueur braise, vue de dessus.",
}
for k, p in DECO.items():
    w(k, f"ÉLÉMENT DE DÉCOR : {p} {T}")

# --- Portraits (dialogues) ---
PORTRAIT = "PORTRAIT en buste pour boîte de dialogue, cadré épaules et visage, de trois quarts, expressif. " + T
w("portrait_lyse", f"{PORTRAIT} « Lyse Aubeclair », pilote de 17 ans, peau brune, cheveux bouclés courts noirs avec une mèche cyan, grands yeux déterminés, taches de rousseur dorées, combinaison de vol blanc nacré à liserés cyan et or, petit casque-visière relevé sur le front, sourire courageux.")
w("portrait_pilou", f"{PORTRAIT} « Pilou », petit drone-lanterne rond de céramique blanche et d'or, un grand œil-lumière cyan expressif et joyeux, deux ailettes, une petite antenne, lueur chaleureuse.")
w("portrait_archonte", f"{PORTRAIT} « L'Archonte Cendre », souverain mystérieux de la Flotte Éteignoir : grande silhouette en armure d'obsidienne, masque lisse sans visage avec une fente de lumière violette, couronne de flèches dorées ternies, cape de fumée et de braises, menaçant et majestueux.")

# --- Écrans ---
w("key_art", "ILLUSTRATION D'ÉCRAN TITRE, format PORTRAIT (2:3, vertical). L'Étincelle, petit chasseur blanc nacré et cyan, fonce vers le haut en laissant une traînée de lumière cyan, au milieu d'une pluie de tirs ennemis magenta en forme de motifs géométriques ; en haut, la silhouette menaçante d'un soleil noir couronné (l'Archonte) qui aspire une étoile dorée mourante. Nébuleuses roses et indigo. Laisser le TIERS SUPÉRIEUR un peu plus calme pour un logo. Sans texte.")
w("fin", "ILLUSTRATION DE FIN, format PORTRAIT (2:3, vertical). L'étoile Astrée rallumée explose de lumière dorée et cyan au centre, l'Étincelle minuscule en silhouette devant elle, des débris d'obsidienne de la flotte vaincue s'éloignent, nébuleuses qui reprennent leurs couleurs. Émouvant et triomphal. Sans texte.")

# --- Icônes d'améliorations ---
ICONE = "ICÔNE D'AMÉLIORATION pour l'interface d'un jeu, objet unique stylisé en céramique blanc nacré, émail et or, très lisible même en petit, légère lueur. " + T
ICONES = {
    "icone_puissance": "un cristal d'énergie cyan en forme d'éclair dans une monture d'or (puissance de tir).",
    "icone_satellite": "deux petites lanternes-satellites en orbite autour d'un point lumineux (satellites).",
    "icone_missile": "un petit missile à tête chercheuse blanc et rose avec une traînée courbe (missiles).",
    "icone_bouclier": "un bouclier hexagonal translucide cyan bordé d'or (bouclier).",
    "icone_aimant": "un aimant en fer à cheval d'émail rouge et or attirant des éclats dorés (aimant).",
    "icone_bombe": "une sphère d'énergie nova dorée et cyan prête à exploser (bombe nova).",
    "icone_coeur": "un cœur de cristal rose dans une monture d'or (vie supplémentaire).",
    "icone_eclat": "un tas d'éclats d'étoile dorés et cyan scintillants (monnaie : éclats).",
}
for k, p in ICONES.items():
    w(k, f"{ICONE} {p}")
