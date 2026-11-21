"""
test_dashboard.py — Tests du cœur du dashboard de bureau, sans interface ni
webcam :  python -m pytest test_dashboard.py   (ou  python test_dashboard.py)
"""

import os
import tempfile

from src.core import biomeca as b
from src.data.store import Store, lire_mensuration, BORNES_TAILLE


def _store():
    return Store(os.path.join(tempfile.mkdtemp(), "axio.db"))


def test_plages_locales_comme_le_web():
    assert b.plages_locales(None, None, None, None) == {
        "knee": (140, 150), "hip": (45, 60), "elbow": (150, 165), "shoulder": (85, 100)}
    chrono = b.plages_locales("CHRONO", "AERO", 184, 88.5)
    assert chrono["elbow"] == (90, 110)
    assert chrono["hip"] == (36, 51)          # -5 pratique, +1 morphologie


def test_statut_et_consignes():
    assert b.statut_mesure(145, (140, 150)) == "OK"
    assert b.statut_mesure(141, (140, 150)) == "WARNING"
    assert b.statut_mesure(156, (140, 150)) == "OUT"
    constats = b.etablir_constats({"knee": 156, "elbow": 170}, b.plages_locales(None, None, None, None), {}, 84.5)
    consignes = b.consignes_par_priorite(constats)
    assert [c["joint"] for c in consignes] == ["knee", "elbow"]
    assert "Correction estimée : environ" in consignes[0]["consigne"]


def test_cadre():
    assert b.estimer_cadre("ROUTE", 178, 84.5) == "M–L"
    assert b.estimer_cadre(None, None, None) is None


def test_validation_externe_rejette_les_ecarts():
    ref = b.plages_locales(None, None, None, None)
    bon = {"ranges": {"knee": [141, 151], "hip": [44, 58], "elbow": [150, 164], "shoulder": [86, 99]},
           "advice": {"knee_high": "Baisser la selle.", "hip_low": "Risque de douleur au dos."}}
    plages, conseils = b.valider_plages_externes(bon, ref)
    assert plages["knee"] == (141, 151)
    assert ("knee", "high") in conseils and ("hip", "low") not in conseils
    bon["ranges"]["knee"] = [100, 120]
    assert b.valider_plages_externes(bon, ref) is None


def test_mensurations():
    assert lire_mensuration("84,5", BORNES_TAILLE) == (False, None)   # hors bornes taille
    assert lire_mensuration("178,3", BORNES_TAILLE) == (True, 178.5)
    assert lire_mensuration("", BORNES_TAILLE) == (True, None)


def test_seance_de_bout_en_bout():
    s = _store()
    assert s.statistiques()["etudes_realisees"] == 0 and s.etude_demo() is not None
    cid = s.creer_client("Camille", 170, 80)
    eid = s.creer_etude(cid, "ROUTE", "MIXTE")
    assert s.ouvrir_seance(eid, externe=False)["plages_seance"]["source"] == "locale"
    assert not s.enregistrer_seance(eid, {"knee": None})
    assert s.enregistrer_seance(eid, {"knee": 155, "hip": 50})
    e = s.etude(eid)
    assert e["status"] == "COMPLETED" and e["cadre_conseille"]
    assert [m["status"] for m in e["mesures"]] == ["OUT", "OK"]
    assert s.statistiques()["ecarts_detectes"] == 1
    assert not s.enregistrer_seance(eid, {"knee": 145})          # plus un brouillon
    s.supprimer_client(cid)
    assert s.etude(eid) is None


if __name__ == "__main__":
    for nom, f in list(globals().items()):
        if nom.startswith("test_"):
            f()
            print("ok", nom)
