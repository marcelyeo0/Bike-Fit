"""Tests du moteur de recommandations."""

import pytest

from analysis.recommender import Recommendation, evaluate


def _messages(recos: list[Recommendation]) -> str:
    return " | ".join(r.message for r in recos)


def test_posture_conforme():
    measures = {"knee_bottom": 142, "knee_top": 67, "trunk": 42,
                "elbow": 155, "hip_top": 55}
    recos = evaluate(measures, "performance")
    assert len(recos) == 1
    assert recos[0].severity == "ok"


def test_genou_trop_tendu_descendre_la_selle():
    recos = evaluate({"knee_bottom": 150}, "performance")  # cible 140–145
    assert any(r.metric == "knee_bottom" for r in recos)
    msg = _messages(recos)
    assert "descendre la selle" in msg
    # Écart 5° × 3,5 mm/° ≈ 17,5 → arrondi à 20 mm (multiple de 5).
    assert "20 mm" in msg


def test_genou_trop_flechi_monter_la_selle():
    recos = evaluate({"knee_bottom": 132}, "performance")
    msg = _messages(recos)
    assert "monter la selle" in msg
    # Écart 8° × 3,5 ≈ 28 → 30 mm.
    assert "30 mm" in msg


def test_pas_de_double_conseil_selle():
    # Genou trop fléchi en bas ET trop fermé en haut : même remède (monter
    # la selle) → une seule recommandation selle, pas deux contradictoires.
    recos = evaluate({"knee_bottom": 130, "knee_top": 55}, "performance")
    saddle = [r for r in recos if "selle" in r.message]
    assert len(saddle) == 1


def test_dos_trop_plongeant_en_confort():
    recos = evaluate({"trunk": 35}, "confort")  # cible 45–55
    msg = _messages(recos)
    assert "relever le cintre" in msg


def test_meme_mesure_verdict_different_selon_mode():
    # Tronc à 38° : conforme en aéro (30–40), trop plongeant en confort (45–55).
    assert evaluate({"trunk": 38}, "aero")[0].severity == "ok"
    assert evaluate({"trunk": 38}, "confort")[0].severity == "warn"


def test_bras_trop_tendus():
    recos = evaluate({"elbow": 172}, "performance")  # cible 150–160
    assert "tendus" in _messages(recos)


def test_hanche_trop_fermee():
    recos = evaluate({"hip_top": 38}, "performance")  # minimum 45
    assert "Hanche trop fermée" in _messages(recos)


def test_mode_inconnu():
    with pytest.raises(ValueError):
        evaluate({}, "turbo")


def test_mesures_vides_pas_de_crash():
    recos = evaluate({}, "confort")
    assert recos[0].severity == "ok"
