"""
ranges.py — Obtient les plages d'angles cibles à partir du profil du cycliste.

Flux : profil (réponses du questionnaire) → prompt → API Gemini → JSON →
dict de AngleRange, prêt à être passé à SessionAngles.

Pré-requis :
    pip install google-genai python-dotenv
    Un fichier .env à la racine contenant :  GEMINI_API_KEY=...

Utilisation :
    from src.core.ranges import get_target_ranges
    ranges = get_target_ranges(bike_type="road", position="mix", comment="mal au dos")
    # -> {"knee": AngleRange(140, 150), "hip": AngleRange(...), ...}
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
SYSTEM_PROMPT = """Tu es un expert en bike fitting (positionnement vélo).
On te donne le profil d'un cycliste. Tu renvoies les plages d'angles
articulaires cibles, mesurés de profil pendant le pédalage.

Articulations à fournir : knee, hip, elbow, shoulder.
- knee : angle d'extension maximale au point mort bas (pédale à 6h)
- hip : angle minimal de la hanche (position la plus fermée)
- elbow : angle moyen du coude
- shoulder : angle moyen épaule (bras/buste)

Adapte les plages selon le type de vélo et la position souhaitée.
Prends en compte le commentaire du cycliste s'il signale une douleur.

RÉPONDS UNIQUEMENT avec un objet JSON, sans texte ni balises markdown,
au format exact :
{"knee": [min, max], "hip": [min, max], "elbow": [min, max], "shoulder": [min, max]}
Les valeurs sont des entiers en degrés, entre 0 et 180."""


def _build_user_message(bike_type: str, position: str, comment: str) -> str:
    """Construit le message décrivant le profil du cycliste."""
    msg = f"Type de vélo : {bike_type}\nPosition souhaitée : {position}"
    if comment.strip():
        msg += f"\nCommentaire du cycliste : {comment}"
    return msg


def _parse_ranges(raw_text: str) -> dict:
    """
    Transforme le texte JSON renvoyé par l'API en dict de AngleRange.
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

    ranges = {}
    for joint in JOINT_ANGLES:                 # knee, hip, elbow, shoulder
        lo, hi = data[joint]                    # ex : [140, 150]
        ranges[joint] = AngleRange(lo, hi)      # valide les bornes au passage
    return ranges


def get_target_ranges(bike_type: str, position: str, comment: str = "") -> dict:
    """
    Renvoie {"knee": AngleRange, "hip": ..., ...} pour ce profil.

    En cas de problème (pas de clé, pas de réseau, réponse illisible),
    renvoie DEFAULT_RANGES au lieu de planter : le logiciel reste utilisable.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ranges] Pas de clé API trouvée, utilisation des plages par défaut.")
        return DEFAULT_RANGES

    try:
        # Import ici (pas en haut) pour que le module se charge même si
        # 'google-genai' n'est pas installé — utile tant que tu testes le reste.
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=_build_user_message(bike_type, position, comment),
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

        return _parse_ranges(response.text)

    except Exception as e:
        # On ne laisse JAMAIS une erreur API casser l'app : on retombe
        # sur les valeurs par défaut en signalant le souci.
        print(f"[ranges] Erreur API ({e}), utilisation des plages par défaut.")
        return DEFAULT_RANGES


# Petit test manuel : python -m src.core.ranges
if __name__ == "__main__":
    result = get_target_ranges("road", "mix", "j'ai mal au dos après une heure")
    for joint, rng in result.items():
        print(f"{joint}: [{rng.min_deg}, {rng.max_deg}]")