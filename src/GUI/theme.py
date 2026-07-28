"""
theme.py — Palette, typographie et constantes partagées par toutes les fenêtres.

Principes appliqués (design system) :
  - base NEUTRE (gamme zinc, gris froids cohérents partout), jamais de noir
    ni de blanc "purs" agressifs ;
  - UN SEUL accent, désaturé (pas de bleu criard) ;
  - hiérarchie typographique par la graisse et la couleur, pas seulement
    la taille ; chiffres en police à chasse fixe (pas de tremblement de
    largeur quand la valeur change) ;
  - vert/rouge réservés à l'état des articulations, eux aussi désaturés.

Typographie : PILES DE FAMILLES résolues à l'exécution (init_fonts), pas de
famille codée en dur. Tk remplace silencieusement une famille absente par sa
police par défaut — c'est exactement le rendu « mort » qu'on évite. Ordre de
préférence : SF Pro (si installée) → Segoe UI Variable (Windows 11) →
Segoe UI. Valeurs numériques en chasse fixe (SF Mono → Cascadia Mono).
"""

import tkinter.font as tkfont

# --- Couleurs (gamme zinc + accent unique) --------------------------------- #
BG = "#FAFAFA"            # fond général (zinc-50, jamais blanc pur)
BG_DARK = "#18181B"       # panneau de marque (zinc-900, jamais noir pur)
BG_DARK_2 = "#27272A"     # surfaces sur fond sombre (zinc-800)
CARD = "#FFFFFF"          # cartes (seul blanc autorisé : élévation réelle)
ACCENT = "#3572D6"        # bleu désaturé (~75 % de saturation)
ACCENT_HOVER = "#2C5FB4"  # accent au survol
GREEN = "#2FA35C"         # dans la plage (émeraude désaturée)
RED = "#D05353"           # hors plage (rouge désaturé)
RED_HOVER = "#B84545"     # rouge au survol (bouton Terminer)
GRAY = "#A1A1AA"          # pas de mesure (zinc-400)
TEXT = "#1B1B1F"          # texte principal (off-black)
TEXT_2 = "#71717A"        # texte secondaire (zinc-500)
TEXT_ON_DARK = "#FAFAFA"  # texte sur panneau sombre
TEXT_2_ON_DARK = "#A1A1AA"
SEPARATOR = "#E4E4E7"     # filets de séparation (zinc-200)

# --- Typographie ----------------------------------------------------------- #
# Piles de préférence par rôle : la première famille INSTALLÉE gagne.
# SF Pro (la police d'Apple) en tête quand elle est présente sur la machine,
# repli Segoe UI Variable (Windows 11) puis Segoe UI — on ne la redistribue
# pas (licence Apple), on la préfère juste si l'utilisateur l'a.
_DISPLAY_STACK = ["SF Pro Display", "Segoe UI Variable Display", "Segoe UI"]
_TEXT_STACK = ["SF Pro Text", "SF Pro Display",
               "Segoe UI Variable Text", "Segoe UI"]
_MONO_STACK = ["SF Mono", "Cascadia Mono", "Consolas", "Courier New"]

# Valeurs par défaut sûres, remplacées par init_fonts() dès la première
# fenêtre. Les widgets lisent toujours theme.FONT_X à leur construction,
# donc la résolution s'applique partout sans autre changement.
DISPLAY = "Segoe UI"
FAMILY = "Segoe UI"
MONO = "Cascadia Mono"

FONTS_READY = False


def _build_fonts():
    """(Re)construit les rôles typographiques à partir des familles courantes.
    Hiérarchie par graisse + taille + couleur ; échelle resserrée, les
    en-têtes de groupe plus petits et discrets (le contenu domine)."""
    global FONT_DISPLAY, FONT_TITLE, FONT_SUBTITLE, FONT_SECTION
    global FONT_BODY, FONT_VALUE, FONT_SMALL, FONT_BUTTON
    FONT_DISPLAY = (DISPLAY, 36, "bold")    # marque / titre d'écran
    FONT_TITLE = (DISPLAY, 23, "bold")      # titre de section d'écran
    FONT_SUBTITLE = (FAMILY, 13)
    FONT_SECTION = (FAMILY, 11, "bold")     # en-têtes de groupe (gris, discrets)
    FONT_BODY = (FAMILY, 14)
    FONT_VALUE = (MONO, 24, "bold")         # angles : chasse fixe obligatoire
    FONT_SMALL = (FAMILY, 12)
    FONT_BUTTON = (FAMILY, 15, "bold")      # boutons d'action


_build_fonts()


def init_fonts(root):
    """À appeler UNE FOIS, juste après la création de la première fenêtre
    (tkfont.families a besoin d'un root). Résout chaque pile sur les polices
    réellement installées puis reconstruit les rôles FONT_*."""
    global DISPLAY, FAMILY, MONO, FONTS_READY
    if FONTS_READY:
        return
    installed = set(tkfont.families(root))

    def pick(stack, fallback):
        return next((f for f in stack if f in installed), fallback)

    DISPLAY = pick(_DISPLAY_STACK, DISPLAY)
    FAMILY = pick(_TEXT_STACK, FAMILY)
    MONO = pick(_MONO_STACK, MONO)
    _build_fonts()
    FONTS_READY = True

# --- Boutons (langage « pill » monochrome) --------------------------------- #
# Le bouton primaire est SOMBRE (zinc-900), pas bleu : l'accent bleu reste
# pour les détails (sélection, liens), les actions vivent en noir/blanc.
# Forme pilule : rayon = moitié de la hauteur.
BTN_DARK = "#18181B"        # action principale (zinc-900)
BTN_DARK_HOVER = "#2E2E33"  # survol : un cran plus clair, jamais plus sombre

# Rayon commun des surfaces arrondies (cartes).
RADIUS = 16

# Hauteur commune des boutons d'action (pleine largeur) + rayon pilule.
BTN_HEIGHT = 48
BTN_RADIUS = BTN_HEIGHT // 2


def to_bgr(hex_color: str) -> tuple:
    """'#RRGGBB' → (B, G, R) pour OpenCV. Une seule source de vérité :
    les couleurs du squelette suivent la palette sans duplication manuelle."""
    h = hex_color.lstrip("#")
    return (int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16))
