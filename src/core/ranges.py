"""
ranges.py — Obtient les plages d'angles cibles à partir du profil du cycliste.

Flux : profil (réponses du questionnaire) → prompt → API Gemini → JSON →
dict de AngleRange, prêt à être passé à SessionAngles.

Pré-requis :
    pip install google-genai python-dotenv
    Un fichier .env à la racine contenant :  GEMINI_API_KEY=...

Utilisation :
    from src.core.ranges import get_target_ranges
    ranges, advice = get_target_ranges({
        "bike_type": "route", "position": "mixte", "flexibility": "moyenne",
        "level": "intermédiaire", "volume": "3-6 h", "age": "30-50 ans",
        "comment": "mal au dos"})
    # ranges -> {"knee": AngleRange(140, 150), "hip": AngleRange(...), ...}
    # advice -> {("knee", "high"): "Abaisse ta selle de 5 mm.", ...}
"""

import json
import os

from dotenv import load_dotenv

from src.core.angles import AngleRange, JOINT_ANGLES


# Charge le .env (lit le fichier et met les variables dans os.environ).
# À faire une seule fois, à l'import du module.
load_dotenv()

# Même modèle que feedback.py : un seul fournisseur pour tout le projet.
# Alias "latest" : Google le fait pointer vers la dernière version flash,
# donc pas de 404 le jour où un numéro de version est retiré.
MODEL_NAME = "gemini-flash-latest"


# Plages par défaut, utilisées en SECOURS si l'API échoue (pas de réseau,
# pas de clé, réponse illisible...). Le logiciel reste utilisable hors ligne.
DEFAULT_RANGES = {
    "knee": AngleRange(140, 150),
    "hip": AngleRange(45, 60),
    "elbow": AngleRange(150, 165),
    "shoulder": AngleRange(85, 100),
}


# Le prompt système : on cadre STRICTEMENT la réponse pour qu'elle soit
# du JSON pur et rien d'autre (pas de texte, pas de ```). C'est la clé
# pour pouvoir parser la réponse de façon fiable.
#
# En plus des plages, on demande les CONSEILS D'AJUSTEMENT par articulation
# et direction d'écart. Pourquoi ici et pas en direct ? Un appel API par
# frame est impossible (latence, coût) : on fait générer les 8 conseils
# UNE FOIS au setup, personnalisés au profil, et la boucle vidéo les
# affiche instantanément dès qu'un angle sort de sa plage.
SYSTEM_PROMPT = """Tu es un expert en bike fitting (positionnement vélo).
On te donne le profil d'un cycliste. Tu renvoies :
1. les plages d'angles articulaires cibles, mesurés de profil pendant le pédalage ;
2. pour chaque articulation et chaque direction d'écart, le conseil de
   réglage VÉLO à afficher en direct pendant la session.

Articulations : knee, hip, elbow, shoulder.
- knee : angle d'extension maximale au point mort bas (pédale à 6h)
- hip : angle minimal de la hanche (position la plus fermée)
- elbow : angle moyen du coude
- shoulder : angle moyen épaule (bras/buste)

Le profil contient : type de vélo, position recherchée, souplesse,
niveau de pratique, volume hebdomadaire, tranche d'âge, commentaire.
Croise ces critères pour ajuster les plages :
- vélo + position : base des plages (aéro = hanche plus fermée, coude
  plus fléchi ; confort = buste redressé, hanche plus ouverte) ;
- souplesse faible : ne force JAMAIS une hanche fermée ni une grande
  extension de genou — relève les minima de hip, réduit le max de knee ;
- débutant ou faible volume : plages conservatrices, proches du confort,
  même si la position demandée est agressive ;
- confirmé + gros volume : plages plus étroites et position plus engagée
  tolérable ;
- âge élevé : biais confort (hanche et épaule plus ouvertes).
Prends en compte le commentaire du cycliste s'il signale une douleur :
c'est le critère PRIORITAIRE sur tous les autres.

Chaque conseil ("advice") fait DEUX phrases, tutoiement, max 30 mots :
1. le CONSTAT postural : ce qu'on observe sur le corps du cycliste et la
   cause probable côté vélo (ex. « Jambe presque tendue en bas de
   pédale — selle sans doute trop haute. ») ;
2. l'ACTION de réglage : composant à ajuster (hauteur de selle,
   avance/recul de selle, hauteur ou longueur de potence, cintre) +
   direction + ordre de grandeur en mm, si utile proportionné à l'écart
   (ex. « Abaisse-la d'environ 3 mm par degré d'écart. »).
Priorité selle (hauteur, avance-recul) pour knee et hip ; cockpit
(potence, cintre) pour elbow et shoulder. Adapte le ton et la prudence
des réglages au profil (débutant = pas plus petits). "high" = angle
mesuré AU-DESSUS de la plage, "low" = en dessous.

RÉPONDS UNIQUEMENT avec un objet JSON, sans texte ni balises markdown,
au format exact :
{
  "ranges": {"knee": [min, max], "hip": [min, max], "elbow": [min, max], "shoulder": [min, max]},
  "advice": {
    "knee_high": "...", "knee_low": "...",
    "hip_high": "...", "hip_low": "...",
    "elbow_high": "...", "elbow_low": "...",
    "shoulder_high": "...", "shoulder_low": "..."
  }
}
Les valeurs de plages sont des entiers en degrés, entre 0 et 180."""


# Libellés français des champs du profil, dans l'ordre d'affichage du
# prompt. Le commentaire est traité à part (optionnel, en dernier).
_PROFILE_FIELDS = [
    ("bike_type", "Type de vélo"),
    ("position", "Position souhaitée"),
    ("flexibility", "Souplesse (capacité à toucher ses pieds jambes tendues)"),
    ("level", "Niveau de pratique"),
    ("volume", "Volume hebdomadaire"),
    ("age", "Tranche d'âge"),
]


def _build_user_message(profile: dict) -> str:
    """Construit le message décrivant le profil du cycliste. Les champs
    absents du dict sont simplement omis (compatibilité profils réduits)."""
    lines = [f"{label} : {profile[key]}"
             for key, label in _PROFILE_FIELDS if profile.get(key)]
    comment = profile.get("comment", "").strip()
    if comment:
        lines.append(f"Commentaire du cycliste : {comment}")
    return "\n".join(lines)


def _parse_response(raw_text: str) -> tuple:
    """
    Transforme le texte JSON renvoyé par l'API en (ranges, advice) :
      - ranges : dict de AngleRange
      - advice : dict {("knee", "high"): "conseil...", ...} — vide si absent
        (l'appelant retombe alors sur les diagnostics standard).
    Lève une exception si le format est inattendu (géré par l'appelant).
    """
    # Filet de sécurité : les modèles ajoutent parfois des ``` malgré la
    # consigne. On retire ces balises avant de parser.
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        # enlève la première et la dernière ligne (``` ... ```)
        cleaned = "\n".join(cleaned.split("\n")[1:-1])
        cleaned = cleaned.replace("json", "", 1).strip()

    data = json.loads(cleaned)   # str JSON -> dict Python

    # Tolérance ancien format : plages directement à la racine.
    raw_ranges = data.get("ranges", data)
    ranges = {}
    for joint in JOINT_ANGLES:                 # knee, hip, elbow, shoulder
        lo, hi = raw_ranges[joint]              # ex : [140, 150]
        ranges[joint] = AngleRange(lo, hi)      # valide les bornes au passage

    # Conseils "joint_direction" → clé tuple, seuls les textes non vides.
    advice = {}
    for key, text in data.get("advice", {}).items():
        joint, _, direction = key.rpartition("_")
        if joint in JOINT_ANGLES and direction in ("high", "low") \
                and isinstance(text, str) and text.strip():
            advice[(joint, direction)] = text.strip()
    return ranges, advice


def get_target_ranges(profile: dict) -> tuple:
    """
    profile : dict du questionnaire (voir _PROFILE_FIELDS + "comment").
    Renvoie (ranges, advice) pour ce profil :
      - ranges : {"knee": AngleRange, "hip": ..., ...}
      - advice : {("knee", "high"): "Abaisse ta selle de 5 mm.", ...}
        conseils de réglage vélo personnalisés, affichés EN DIRECT quand
        un angle sort de sa plage. Vide si l'IA n'a pas répondu (les
        diagnostics standard de feedback.py prennent alors le relais).

    En cas de problème (pas de clé, pas de réseau, réponse illisible),
    renvoie (DEFAULT_RANGES, {}) au lieu de planter.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ranges] Pas de clé API trouvée, utilisation des plages par défaut.")
        return DEFAULT_RANGES, {}

    try:
        # Import ici (pas en haut) pour que le module se charge même si
        # 'google-genai' n'est pas installé — utile tant que tu testes le reste.
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=_build_user_message(profile),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                # Force une réponse JSON pure : plus fiable que la seule
                # consigne du prompt (pas de texte autour, pas de ```).
                response_mime_type="application/json",
                # Les modèles Gemini récents « réfléchissent » avant de
                # répondre et ces tokens de réflexion comptent dans
                # max_output_tokens : un petit budget tronquerait la réponse
                # avant même le JSON. D'où cette valeur généreuse.
                max_output_tokens=4000,
            ),
        )

        return _parse_response(response.text)

    except Exception as e:
        # On ne laisse JAMAIS une erreur API casser l'app : on retombe
        # sur les valeurs par défaut en signalant le souci.
        print(f"[ranges] Erreur API ({e}), utilisation des plages par défaut.")
        return DEFAULT_RANGES, {}


# Petit test manuel : python -m src.core.ranges
if __name__ == "__main__":
    ranges, advice = get_target_ranges({
        "bike_type": "route", "position": "aéro", "flexibility": "faible",
        "level": "débutant", "volume": "< 3 h", "age": "> 50 ans",
        "comment": "j'ai mal au dos après une heure",
    })
    for joint, rng in ranges.items():
        print(f"{joint}: [{rng.min_deg}, {rng.max_deg}]")
    for key, text in advice.items():
        print(f"{key}: {text}")