"""
biomeca.py — Fourchettes cibles, statut des mesures, consignes de réglage
et estimation de cadre.

Portage fidèle de la version web (src/lib/biomeca/{plages,regles,cadre}.ts
sur la branche web_docker) : le logiciel de bureau et le dashboard web
produisent les mêmes comptes rendus pour les mêmes mesures.

ATTENTION : comme côté web, les valeurs de la table et les ajustements sont
des ordres de grandeur usuels, pas des valeurs sourcées. À faire valider par
un fitter.

Vocabulaire : réglage, position, fourchette, confort. Aucun terme de soin.
"""

import json
import math
import os
import re

# Articulations jugées, dans l'ordre d'affichage. Clés en minuscules : ce
# sont celles de src/core/angles.py (JOINT_ANGLES).
ARTICULATIONS = ["knee", "hip", "elbow", "shoulder"]

# Ordre dans lequel un fitter règle un vélo : hauteur de selle, recul de
# selle, puis poste de pilotage. C'est aussi la priorité des consignes.
PRIORITE = ["knee", "hip", "shoulder", "elbow"]

PRATIQUES = ["ROUTE", "GRAVEL", "CHRONO"]
OBJECTIFS = ["CONFORT", "MIXTE", "AERO"]

_BASE = {
    "CONFORT": {"knee": (140, 150), "hip": (50, 65),
                "elbow": (150, 165), "shoulder": (80, 95)},
    "MIXTE": {"knee": (140, 150), "hip": (45, 60),
              "elbow": (150, 165), "shoulder": (85, 100)},
    "AERO": {"knee": (142, 152), "hip": (40, 55),
             "elbow": (140, 160), "shoulder": (88, 103)},
}

# Décalage appliqué à la table selon la pratique (min et max ensemble).
_DECALAGE_PRATIQUE = {
    "ROUTE": {},
    "GRAVEL": {"hip": 3, "shoulder": -3},   # position plus relevée
    "CHRONO": {"hip": -5, "shoulder": -5},  # buste couché
}

# Sur prolongateurs l'avant-bras est à plat : le coude se ferme vers l'équerre.
_COUDE_CHRONO = (90, 110)

_RAPPORT_MOYEN = 0.47        # entrejambe / taille d'une morphologie moyenne
_DECALAGE_MORPHO_MAX = 3

# À moins de tant de degrés d'une borne : « proche de la limite ».
MARGE_LIMITE = 2


def decalage_morphologique(taille_cm, entrejambe_cm) -> int:
    """Positif = jambes longues et buste court : hanche plus ouverte,
    épaule plus fermée. Zéro sans les deux mensurations."""
    if taille_cm is None or entrejambe_cm is None or taille_cm <= 0:
        return 0
    ecart = (entrejambe_cm / taille_cm - _RAPPORT_MOYEN) * 100
    return _arrondi(min(_DECALAGE_MORPHO_MAX, max(-_DECALAGE_MORPHO_MAX, ecart)))


def _arrondi(x: float) -> int:
    """Math.round de JavaScript (demi vers +inf), pas l'arrondi bancaire."""
    return math.floor(x + 0.5)


def plages_locales(pratique, objectif, taille_cm, entrejambe_cm) -> dict:
    """{"knee": (min, max), ...} pour une étude. Sans pratique ni objectif :
    route / mixte. Le genou n'est pas ajusté à la morphologie."""
    base = _BASE[objectif or "MIXTE"]
    par_pratique = _DECALAGE_PRATIQUE[pratique or "ROUTE"]
    morpho = decalage_morphologique(taille_cm, entrejambe_cm)

    def decaler(plage, degres):
        return (plage[0] + degres, plage[1] + degres)

    return {
        "knee": decaler(base["knee"], par_pratique.get("knee", 0)),
        "hip": decaler(base["hip"], par_pratique.get("hip", 0) + morpho),
        "elbow": (_COUDE_CHRONO if pratique == "CHRONO"
                  else decaler(base["elbow"], par_pratique.get("elbow", 0))),
        "shoulder": decaler(base["shoulder"],
                            par_pratique.get("shoulder", 0) - morpho),
    }


def statut_mesure(valeur: float, plage) -> str:
    """'OK', 'WARNING' (proche d'une borne) ou 'OUT' (hors fourchette)."""
    mn, mx = plage
    if valeur < mn or valeur > mx:
        return "OUT"
    if valeur - mn < MARGE_LIMITE or mx - valeur < MARGE_LIMITE:
        return "WARNING"
    return "OK"


# --------------------------------------------------------------------------- #
# Consignes
# --------------------------------------------------------------------------- #

CONSEILS_STANDARD = {
    ("knee", "high"): "Jambe presque tendue en bas de pédalage : selle probablement trop haute. Baisser la selle.",
    ("knee", "low"): "Genou encore fléchi en bas de pédalage : selle probablement trop basse. Monter la selle.",
    ("hip", "high"): "Hanche très ouverte, buste plus redressé que la fourchette visée. Reculer la selle de 5 mm ou allonger le poste de pilotage.",
    ("hip", "low"): "Hanche très fermée, buste très incliné. Avancer la selle de 5 mm ou relever le cintre.",
    ("elbow", "high"): "Bras presque tendus : poste de pilotage probablement trop long. Raccourcir la potence de 10 mm.",
    ("elbow", "low"): "Bras très pliés : poste de pilotage probablement trop court. Allonger la potence de 10 mm.",
    ("shoulder", "high"): "Épaule très ouverte, grande allonge. Choisir une potence plus courte ou relever le cintre.",
    ("shoulder", "low"): "Épaule fermée, allonge réduite. Baisser le cintre ou allonger la potence.",
}

_PART_FEMUR = 0.53
_PART_TIBIA = 0.47
_MM_PAR_DEGRE = 2.5
_CORRECTION_MAX_MM = 30


def _distance_hanche_cheville(femur, tibia, angle_deg):
    r = math.radians(angle_deg)
    return math.sqrt(femur * femur + tibia * tibia - 2 * femur * tibia * math.cos(r))


def correction_selle_mm(angle_mesure: float, plage, entrejambe_cm) -> int:
    """Correction de hauteur de selle en mm (toujours positive, le sens est
    porté par la consigne). Approximation hanche et cheville fixes."""
    cible = (plage[0] + plage[1]) / 2
    if entrejambe_cm is None:
        brute = abs(angle_mesure - cible) * _MM_PAR_DEGRE
    else:
        f, t = entrejambe_cm * _PART_FEMUR, entrejambe_cm * _PART_TIBIA
        brute = abs(_distance_hanche_cheville(f, t, cible)
                    - _distance_hanche_cheville(f, t, angle_mesure)) * 10
    return min(_CORRECTION_MAX_MM, max(1, _arrondi(brute)))


def etablir_constats(valeurs: dict, plages: dict, conseils: dict,
                     entrejambe_cm) -> list:
    """Un constat par articulation mesurée, dans l'ordre d'affichage :
    {"joint", "valeur", "plage", "statut", "sens", "consigne"}."""
    constats = []
    for joint in ARTICULATIONS:
        brute = valeurs.get(joint)
        if brute is None:
            continue
        valeur = round(brute * 10) / 10
        plage = plages[joint]
        statut = statut_mesure(valeur, plage)
        if statut != "OUT":
            constats.append({"joint": joint, "valeur": valeur, "plage": plage,
                             "statut": statut, "sens": None, "consigne": None})
            continue
        sens = "high" if valeur > plage[1] else "low"
        consigne = conseils.get((joint, sens)) or CONSEILS_STANDARD[(joint, sens)]
        # Seul réglage chiffrable à partir d'un angle : calculé, jamais rédigé.
        if joint == "knee":
            mm = correction_selle_mm(valeur, plage, entrejambe_cm)
            consigne += f" Correction estimée : environ {mm} mm."
        constats.append({"joint": joint, "valeur": valeur, "plage": plage,
                         "statut": statut, "sens": sens, "consigne": consigne})
    return constats


def consignes_par_priorite(constats: list) -> list:
    return sorted((c for c in constats if c["consigne"]),
                  key=lambda c: PRIORITE.index(c["joint"]))


# --------------------------------------------------------------------------- #
# Cadre
# --------------------------------------------------------------------------- #

TAILLES_CADRE = ["XS", "S", "M", "L", "XL"]
_COEFFICIENT_ENTREJAMBE = 0.665
_RETRAIT_CM = {"ROUTE": 0, "GRAVEL": 1, "CHRONO": 2}
_POIDS_ENTREJAMBE = 0.7
_SEUIL_INTERVALLE = 0.25


def estimer_cadre(pratique, taille_cm, entrejambe_cm):
    """« M », ou « S–M » près d'une frontière. None sans mensuration."""
    positions = []
    if entrejambe_cm is not None:
        cadre = entrejambe_cm * _COEFFICIENT_ENTREJAMBE - (_RETRAIT_CM[pratique] if pratique else 0)
        positions.append(((cadre - 48) / 3, _POIDS_ENTREJAMBE))
    if taille_cm is not None:
        positions.append(((taille_cm - 160) / 8, 1 - _POIDS_ENTREJAMBE))
    if not positions:
        return None
    total = sum(p for _, p in positions)
    brute = sum(v * p for v, p in positions) / total
    position = min(len(TAILLES_CADRE) - 1, max(0, brute))
    proche = _arrondi(position)
    ecart = position - proche
    if abs(ecart) <= _SEUIL_INTERVALLE:
        return TAILLES_CADRE[proche]
    voisin = proche + (1 if ecart > 0 else -1)
    petit, grand = min(proche, voisin), max(proche, voisin)
    return f"{TAILLES_CADRE[petit]}–{TAILLES_CADRE[grand]}"


def estimer_hauteur_selle(entrejambe_cm):
    """Hauteur de selle indicative en cm (entrejambe × 0,883)."""
    return None if entrejambe_cm is None else round(entrejambe_cm * 0.883 * 10) / 10


# --------------------------------------------------------------------------- #
# Source externe (Gemini), validée contre la table locale
# --------------------------------------------------------------------------- #

_ECART_EXTERNE_MAX = 15
_LARGEUR_MIN, _LARGEUR_MAX = 4, 30
_LONGUEUR_CONSEIL_MAX = 260
_TERMES_EXCLUS = re.compile(
    r"blessure|douleur|diagnosti|pr[ée]vention|patient|m[ée]dic|th[ée]rap|pathologi",
    re.IGNORECASE)

_CONSIGNE_SYSTEME = """Tu es un expert en positionnement sur le vélo (bike fitting).
On te donne le profil d'un cycliste. Tu renvoies :
1. les fourchettes cibles des angles articulaires, mesurés de profil pendant le pédalage ;
2. pour chaque articulation et chaque sens d'écart, la consigne de réglage du vélo.

Articulations : knee, hip, elbow, shoulder.
- knee : angle interne du genou à l'extension maximale (pédale en bas) ;
- hip : angle épaule-hanche-genou le plus fermé (pédale en haut) ;
- elbow : angle moyen du coude (épaule-coude-poignet) ;
- shoulder : angle moyen de l'épaule (coude-épaule-hanche).

Le profil contient la pratique, l'objectif, et si elles sont connues la
taille et la longueur d'entrejambe en centimètres. Croise ces critères :
- pratique et objectif fixent la base (aéro : hanche plus fermée ; confort :
  buste redressé, hanche plus ouverte ; chrono : appui sur prolongateurs) ;
- le rapport entrejambe / taille renseigne sur les proportions : jambes
  longues et buste court, ou l'inverse. Ajuste hanche et épaule en conséquence.

Chaque consigne fait deux phrases, à l'infinitif, 30 mots au plus :
1. le constat de position et sa cause probable sur le vélo ;
2. l'action de réglage : composant, sens, ordre de grandeur en mm.
Priorité à la selle (hauteur, recul) pour knee et hip, au poste de pilotage
(potence, cintre) pour elbow et shoulder.
"high" = angle mesuré au-dessus de la fourchette, "low" = en dessous.

Vocabulaire imposé : réglage, position, fourchette, confort. N'emploie aucun
terme de santé ou de soin.

Réponds uniquement avec un objet JSON, au format exact :
{
  "ranges": {"knee": [min, max], "hip": [min, max], "elbow": [min, max], "shoulder": [min, max]},
  "advice": {
    "knee_high": "...", "knee_low": "...",
    "hip_high": "...", "hip_low": "...",
    "elbow_high": "...", "elbow_low": "...",
    "shoulder_high": "...", "shoulder_low": "..."
  }
}
Les bornes sont des entiers en degrés, entre 0 et 180."""


def valider_plages_externes(brut, reference: dict):
    """(plages, conseils) si la réponse est exploitable, sinon None. Une
    fourchette absente ou trop loin de la table invalide tout ; les
    conseils sont filtrés un par un."""
    if not isinstance(brut, dict) or not isinstance(brut.get("ranges"), dict):
        return None
    plages = {}
    for joint in ARTICULATIONS:
        paire = brut["ranges"].get(joint)
        if not isinstance(paire, list) or len(paire) != 2:
            return None
        mn, mx = paire
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool)
                   and math.isfinite(v) for v in (mn, mx)):
            return None
        if mn < 0 or mx > 180 or not (_LARGEUR_MIN <= mx - mn <= _LARGEUR_MAX):
            return None
        ref = reference[joint]
        if abs(mn - ref[0]) > _ECART_EXTERNE_MAX or abs(mx - ref[1]) > _ECART_EXTERNE_MAX:
            return None
        plages[joint] = (_arrondi(mn), _arrondi(mx))

    conseils = {}
    advice = brut.get("advice")
    if isinstance(advice, dict):
        for joint in ARTICULATIONS:
            for sens in ("high", "low"):
                texte = advice.get(f"{joint}_{sens}")
                if not isinstance(texte, str):
                    continue
                propre = " ".join(texte.split())
                if 0 < len(propre) <= _LONGUEUR_CONSEIL_MAX and not _TERMES_EXCLUS.search(propre):
                    conseils[(joint, sens)] = propre
    return plages, conseils


LIBELLES_PRATIQUE = {"ROUTE": "Route", "GRAVEL": "Gravel", "CHRONO": "Chrono / triathlon"}
LIBELLES_OBJECTIF = {"CONFORT": "Confort", "MIXTE": "Mixte", "AERO": "Aéro"}


def _interroger_gemini(pratique, objectif, taille_cm, entrejambe_cm):
    cle = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not cle:
        return None
    try:
        from google import genai
        from google.genai import types

        lignes = [f"Pratique : {LIBELLES_PRATIQUE.get(pratique, 'route')}",
                  f"Objectif : {LIBELLES_OBJECTIF.get(objectif, 'mixte')}"]
        if taille_cm is not None:
            lignes.append(f"Taille : {taille_cm} cm")
        if entrejambe_cm is not None:
            lignes.append(f"Entrejambe : {entrejambe_cm} cm")

        client = genai.Client(api_key=cle,
                              http_options=types.HttpOptions(timeout=20_000))
        reponse = client.models.generate_content(
            model="gemini-flash-latest",
            contents="\n".join(lignes),
            config=types.GenerateContentConfig(
                system_instruction=_CONSIGNE_SYSTEME,
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=4000,
            ),
        )
        return json.loads(reponse.text)
    except Exception as erreur:   # réseau, délai, JSON illisible : jamais bloquant
        print(f"[biomeca] Gemini indisponible ({type(erreur).__name__}), table locale utilisée")
        return None


def calculer_plages_seance(pratique, objectif, taille_cm, entrejambe_cm,
                           externe: bool = True) -> dict:
    """Ce qui est figé sur l'étude à l'ouverture de la séance :
    {"source": "gemini"|"locale", "morphologie": bool,
     "plages": {joint: (min, max)}, "conseils": {(joint, sens): texte}}."""
    locale = plages_locales(pratique, objectif, taille_cm, entrejambe_cm)
    morphologie = taille_cm is not None and entrejambe_cm is not None
    if externe:
        valide = valider_plages_externes(
            _interroger_gemini(pratique, objectif, taille_cm, entrejambe_cm), locale)
        if valide:
            plages, conseils = valide
            return {"source": "gemini", "morphologie": morphologie,
                    "plages": plages, "conseils": conseils}
    return {"source": "locale", "morphologie": morphologie,
            "plages": locale, "conseils": {}}


def plages_seance_vers_json(ps: dict) -> str:
    return json.dumps({
        "source": ps["source"], "morphologie": ps["morphologie"],
        "plages": {j: list(p) for j, p in ps["plages"].items()},
        "conseils": {f"{j}_{s}": t for (j, s), t in ps["conseils"].items()},
    }, ensure_ascii=False)


def plages_seance_depuis_json(texte):
    """Relit ce qui a été figé ; None si absent ou illisible."""
    if not texte:
        return None
    try:
        brut = json.loads(texte)
        plages = {j: (float(brut["plages"][j][0]), float(brut["plages"][j][1]))
                  for j in ARTICULATIONS}
        conseils = {}
        for cle, t in (brut.get("conseils") or {}).items():
            joint, _, sens = cle.rpartition("_")
            if joint in ARTICULATIONS and sens in ("high", "low") and t:
                conseils[(joint, sens)] = t
        return {"source": brut.get("source", "locale"),
                "morphologie": bool(brut.get("morphologie")),
                "plages": plages, "conseils": conseils}
    except (ValueError, KeyError, TypeError, IndexError):
        return None
