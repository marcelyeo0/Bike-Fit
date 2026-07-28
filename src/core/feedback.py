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


# Traduction "articulation hors plage" → réglage vélo à faire. Version
# STANDARD, utilisée en repli quand l'IA n'a pas fourni de conseils
# personnalisés au setup (voir ranges.get_target_ranges).
# Clé : (articulation, direction) où direction vaut "high" (au-dessus de la
# plage) ou "low" (en dessous).
# Chaque conseil = CONSTAT postural (ce qu'on voit sur le corps) PUIS
# ACTION de réglage (quoi toucher sur le vélo, direction, ordre de
# grandeur). Les deux ensemble : le constat seul laisse le cycliste
# démuni, l'action seule semble sortir de nulle part.
DIAGNOSTICS = {
    ("knee", "high"): ("Extension du genou trop grande, jambe presque tendue "
                       "en bas de pédale — selle sans doute trop haute. "
                       "Abaisse-la d'environ 3 mm par degré d'écart."),
    ("knee", "low"): ("Genou trop fléchi au point mort bas — selle sans doute "
                      "trop basse. Remonte-la d'environ 3 mm par degré d'écart."),
    ("hip", "high"): ("Hanche très ouverte, buste redressé — position plus "
                      "droite que la cible. Recule la selle de 5 mm ou "
                      "allonge le cockpit."),
    ("hip", "low"): ("Hanche très fermée, buste plongeant — position "
                     "agressive, tension possible bas du dos. Avance la "
                     "selle de 5 mm ou remonte le cintre."),
    ("elbow", "high"): ("Bras quasi tendus, coudes verrouillés — cockpit "
                        "probablement trop long. Raccourcis la potence de "
                        "10 mm ou recule légèrement les mains."),
    ("elbow", "low"): ("Bras très pliés — cockpit probablement trop court. "
                       "Allonge la potence de 10 mm."),
    ("shoulder", "high"): ("Épaules très ouvertes, grande allonge — le poste "
                           "de pilotage est loin. Potence plus courte ou "
                           "plus haute."),
    ("shoulder", "low"): ("Épaules fermées, buste peu incliné — allonge "
                          "insuffisante. Abaisse le cintre ou allonge la "
                          "potence."),
}


def analyse_session(session, ranges: dict, advice_map: dict = None) -> list:
    """
    Compare chaque angle mesuré à sa plage et renvoie une liste de constats.

    advice_map : conseils de réglage personnalisés par l'IA au setup
    ({("knee", "high"): "...", ...}) ; les diagnostics standard servent de
    repli clé par clé.

    Chaque constat est un dict :
        {"joint": "knee", "value": 155.0, "in_range": False,
         "target": (140.0, 150.0), "delta": 5.0,
         "advice": "Selle trop haute : abaisse-la..."}
    delta : écart signé à la borne dépassée (0 si dans la plage).
    advice="" si dans la plage. Articulations sans mesure (None) ignorées.
    """
    advice_map = advice_map or {}
    findings = []
    for joint in JOINT_ANGLES:
        value = session.judged_value(joint)
        if value is None:
            continue  # pas assez de données pour cette articulation

        rng = ranges[joint]
        in_range = rng.contains(value)

        advice, delta = "", 0.0
        if not in_range:
            direction = "high" if value > rng.max_deg else "low"
            delta = value - (rng.max_deg if direction == "high" else rng.min_deg)
            advice = (advice_map.get((joint, direction))
                      or DIAGNOSTICS.get((joint, direction), ""))

        findings.append({
            "joint": joint,
            "value": round(value, 1),
            "in_range": in_range,
            "target": (rng.min_deg, rng.max_deg),
            "delta": round(delta, 1),
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


def build_report(findings: list, note: str = "") -> str:
    """Transforme les constats en texte lisible (version LOCALE, sans IA).
    `note` : ligne de contexte affichée sous le titre (ex. repli hors ligne)."""
    if not findings:
        return "Pas assez de données pour établir un bilan."

    lines = ["Bilan de position"]
    if note:
        lines.append(note)
    lines.append("")
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
        return build_report(findings,
                            note="(bilan local — personnalisation IA indisponible)")

    try:
        from google import genai
        from google.genai import types

        # On sérialise les constats en texte simple pour le prompt, AVEC
        # la plage cible et l'écart signé : sans l'ampleur de l'écart, le
        # modèle ne peut pas chiffrer un réglage en mm.
        def _ligne(f):
            lo, hi = f.get("target", (None, None))
            base = f"{f['joint']}: {f['value']}°"
            if lo is not None:
                base += f" (cible {lo:.0f}–{hi:.0f}°"
                base += ")" if f["in_range"] else f", écart {f['delta']:+.1f}°)"
            return base

        constats = "\n".join(_ligne(f) for f in findings)
        user_msg = f"Constats de la session :\n{constats}"
        if comment.strip():
            user_msg += f"\n\nCommentaire du cycliste : {comment}"

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=user_msg,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "Tu es un expert en bike fitting bienveillant. À partir "
                    "des constats d'angles (valeur, plage cible, écart signé) "
                    "et du commentaire éventuel du cycliste, produis un bilan "
                    "en deux parties, en tutoyant :\n"
                    "1. Un court paragraphe (2-3 phrases) : ce qui va, ce qui "
                    "mérite un ajustement, lien avec la douleur signalée le "
                    "cas échéant.\n"
                    "2. Une section « Réglages recommandés » : une ligne par "
                    "composant à ajuster, au format "
                    "« - Composant : direction, ordre de grandeur en mm — "
                    "pourquoi (1 proposition) ». Composants possibles : "
                    "hauteur de selle, avance/recul de selle, hauteur de "
                    "potence, longueur de potence, cintre. Chiffre chaque "
                    "réglage à partir de l'écart mesuré (règle usuelle : "
                    "1° d'écart au genou ≈ 3 mm de hauteur de selle ; reste "
                    "prudent, propose des pas de 5 mm max à la fois pour le "
                    "recul et 10 mm pour la potence). Priorité : d'abord la "
                    "selle (hauteur puis recul), ensuite le cockpit — un "
                    "réglage de selle change les angles du haut du corps. "
                    "Si tout est dans les plages, dis-le et ne recommande "
                    "aucun réglage. Reste factuel et rassurant, sans jargon "
                    "inutile."
                ),
                # Budget généreux : les tokens de « réflexion » du modèle
                # comptent dedans, 400 tronquait la réponse en pleine phrase.
                max_output_tokens=4000,
            ),
        )
        return response.text

    except Exception as e:
        print(f"[feedback] Erreur API ({e}), bilan local utilisé.")
        return build_report(findings,
                            note="(bilan local — personnalisation IA indisponible)")


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