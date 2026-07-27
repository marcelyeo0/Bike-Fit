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

Sur Windows 11 : "Segoe UI Variable Display" pour les titres (plus dessinée),
"Segoe UI" pour le texte courant, "Cascadia Mono" pour les valeurs numériques.
"""

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
DISPLAY = "Segoe UI Variable Display"   # titres (Windows 11)
FAMILY = "Segoe UI"                     # texte courant
MONO = "Cascadia Mono"                  # valeurs numériques

FONT_DISPLAY = (DISPLAY, 34, "bold")    # marque / titre d'écran
FONT_TITLE = (DISPLAY, 22, "bold")      # titre de section d'écran
FONT_SUBTITLE = (FAMILY, 13)
FONT_SECTION = (FAMILY, 12, "bold")     # en-têtes de groupe (gris, discrets)
FONT_BODY = (FAMILY, 14)
FONT_VALUE = (MONO, 24, "bold")         # angles : chasse fixe obligatoire
FONT_SMALL = (FAMILY, 12)
FONT_BUTTON = (FAMILY, 15, "bold")      # boutons d'action

# Rayon commun des surfaces arrondies.
RADIUS = 16

# Hauteur commune des boutons d'action (pleine largeur).
BTN_HEIGHT = 48


def to_bgr(hex_color: str) -> tuple:
    """'#RRGGBB' → (B, G, R) pour OpenCV. Une seule source de vérité :
    les couleurs du squelette suivent la palette sans duplication manuelle."""
    h = hex_color.lstrip("#")
    return (int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16))
