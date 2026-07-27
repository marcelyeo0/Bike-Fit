"""
feedback.py — Bilan de fin de session de bike fitting.

À la fin d'une analyse, on compare les angles mesurés aux plages cibles et
on produit un compte-rendu lisible pour le cycliste :
  - version LOCALE : factuelle, sans réseau, toujours disponible
  - version IA (Gemini, optionnelle) : personnalisée, tient compte du commentaire

Pré-requis pour la version IA :
    pip install google-genai python-dotenv
    .env à la racine avec :  GEMINI_API_KEY=...

Utilisation :
    from src.core.feedback import analyse_session, build_report, get_ai_feedback
    findings = analyse_session(session, ranges)
    print(build_report(findings))                       # bilan local
    print(get_ai_feedback(findings, comment="mal au dos"))   # bilan personnalisé
"""

import os

from dotenv import load_dotenv

from src.core.angles import JOINT_ANGLES

load_dotenv()

# Alias "latest" : suit la dernière version flash ("gemini-2.5-flash" est
# retiré pour les nouvelles clés → 404), évite les 404 de retrait futurs.
MODEL_NAME = "gemini-flash-latest"


# Traduction "articulation hors plage" → cause probable côté réglage vélo.
# Clé : (articulation, direction) où direction vaut "high" (au-dessus de la
# plage) ou "low" (en dessous).
DIAGNOSTICS = {
    ("knee", "high"): "Extension du genou trop grande : selle probablement trop haute.",
    ("knee", "low"): "Genou trop fléchi en bas : selle probablement trop basse.",
    ("hip", "high"): "Hanche très ouverte : position sans doute trop droite.",
    ("hip", "low"): "Hanche très fermée : position agressive, tension possible bas du dos.",
    ("elbow", "high"): "Bras trop tendus : cintre/potence peut-être trop loin.",
    ("elbow", "low"): "Bras trop pliés : cockpit peut-être trop court.",
    ("shoulder", "high"): "Épaules très ouvertes : allonge importante.",
    ("shoulder", "low"): "Épaules fermées : buste peu incliné.",
}


def analyse_session(session, ranges: dict) -> list:
    """
    Compare chaque angle mesuré à sa plage et renvoie une liste de constats.

    Chaque constat est un dict :
        {"joint": "knee", "value": 155.0, "in_range": False,
         "advice": "Selle probablement trop haute."}   # advice="" si dans la plage
    Les articulations sans mesure exploitable (None) sont ignorées.
    """
    findings = []
    for joint in JOINT_ANGLES:
        value = session.judged_value(joint)
        if value is None:
            continue  # pas assez de données pour cette articulation

        rng = ranges[joint]
        in_range = rng.contains(value)

        advice = ""
        if not in_range:
            direction = "high" if value > rng.max_deg else "low"
            advice = DIAGNOSTICS.get((joint, direction), "")

        findings.append({
            "joint": joint,
            "value": round(value, 1),
            "in_range": in_range,
            "advice": advice,
        })
    return findings


# Noms lisibles pour l'affichage.
JOINT_LABELS = {
    "knee": "Genou",
    "hip": "Hanche",
    "elbow": "Coude",
    "shoulder": "Épaule",
}


def build_report(findings: list) -> str:
    """Transforme les constats en texte lisible (version LOCALE, sans IA)."""
    if not findings:
        return "Pas assez de données pour établir un bilan."

    lines = ["=== Bilan de position ==="]
    for f in findings:
        label = JOINT_LABELS.get(f["joint"], f["joint"])
        etat = "OK" if f["in_range"] else "hors plage"
        line = f"- {label} : {f['value']}° ({etat})"
        if f["advice"]:
            line += f"\n    → {f['advice']}"
        lines.append(line)
    return "\n".join(lines)


def get_ai_feedback(findings: list, comment: str = "") -> str:
    """
    Version enrichie : envoie les constats + le commentaire du cycliste à
    Gemini pour un conseil personnalisé et bienveillant.

    En cas de souci (pas de clé, pas de réseau...), retombe sur le bilan
    local build_report() : jamais de plantage.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return build_report(findings)

    try:
        from google import genai
        from google.genai import types

        # On sérialise les constats en texte simple pour le prompt.
        constats = "\n".join(
            f"{f['joint']}: {f['value']}° "
            f"({'dans la plage' if f['in_range'] else 'hors plage'})"
            for f in findings
        )
        user_msg = f"Constats de la session :\n{constats}"
        if comment.strip():
            user_msg += f"\n\nCommentaire du cycliste : {comment}"

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=user_msg,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Tu es un expert en bike fitting bienveillant. À partir des "
                    "constats d'angles et du commentaire éventuel du cycliste, "
                    "donne un retour clair en 3-4 phrases : ce qui va, ce qui "
                    "mérite un ajustement, et une piste concrète en cm. Reste factuel "
                    "et rassurant, sans jargon inutile. Donne toujours l'ajustement à faire sur le vélo (hauteur/recul de selle )"
                ),
                # Budget généreux : les tokens de « réflexion » du modèle
                # comptent dedans, 400 tronquait la réponse en pleine phrase.
                max_output_tokens=4000,
            ),
        )
        return response.text

    except Exception as e:
        print(f"[feedback] Erreur API ({e}), bilan local utilisé.")
        return build_report(findings)


# Test manuel : python -m src.core.feedback
if __name__ == "__main__":
    from src.core.angles import AngleRange

    class FakeSession:
        _vals = {"knee": 155.0, "hip": 42.0, "elbow": 158.0, "shoulder": 92.0}
        def judged_value(self, name):
            return self._vals.get(name)

    fake_ranges = {
        "knee": AngleRange(140, 150),
        "hip": AngleRange(45, 60),
        "elbow": AngleRange(150, 165),
        "shoulder": AngleRange(85, 100),
    }
    findings = analyse_session(FakeSession(), fake_ranges)
    print(build_report(findings))