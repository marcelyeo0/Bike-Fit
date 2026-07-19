"""Tests du rapport de fin de session."""

from draft.analysis.report import build_report


def test_session_vide():
    report = build_report({}, 0, "performance")
    assert "Aucun cycle" in report


def test_session_courte_signale():
    report = build_report({"knee_bottom": 142.0}, 3, "performance")
    assert "Session courte" in report


def test_rapport_complet():
    summary = {"knee_bottom": 150.0, "knee_top": 67.0, "trunk": 42.0,
               "elbow": 155.0, "hip_top": 55.0}
    report = build_report(summary, 12, "performance")
    assert "Cycles de pédalage analysés : 12" in report
    assert "Genou en bas de course : 150.0°" in report
    assert "✗" in report            # genou hors cible (140–145)
    assert "descendre la selle" in report
    assert "diagnostic médical" in report


def test_rapport_conforme():
    summary = {"knee_bottom": 142.0, "trunk": 42.0}
    report = build_report(summary, 10, "performance")
    assert "aucun réglage nécessaire" in report
    assert "✗" not in report
