"""Tests de la détection du cycle de pédalage sur signaux synthétiques."""

import numpy as np

from analysis.session import CycleEvent, CycleTracker, SessionRecorder


def _run(tracker: CycleTracker, signal) -> list[str]:
    return [e for e in (tracker.update(float(y)) for y in signal) if e]


def test_sinusoide_propre():
    # 10 cycles de pédalage simulés : cheville oscillant sur 80 px, 30 pts/cycle.
    t = np.linspace(0, 10 * 2 * np.pi, 300)
    y = 200 + 40 * np.sin(t)
    events = _run(CycleTracker(), y)
    bottoms = events.count("bottom")
    tops = events.count("top")
    # Le tout premier extremum est volontairement ignoré (sens inconnu).
    assert 8 <= bottoms <= 10
    assert 8 <= tops <= 10


def test_alternance_bas_haut():
    t = np.linspace(0, 6 * 2 * np.pi, 240)
    y = 200 + 40 * np.sin(t)
    events = _run(CycleTracker(), y)
    for prev, cur in zip(events, events[1:]):
        assert prev != cur, "bas et haut doivent alterner strictement"


def test_bruit_seul_sans_pedalage():
    # ±3 px de tremblement sans pédalage : aucun cycle ne doit être détecté.
    rng = np.random.default_rng(7)
    y = 200 + rng.normal(0, 3, size=300)
    events = _run(CycleTracker(), y)
    assert events == []


def test_sinusoide_bruitee():
    rng = np.random.default_rng(3)
    t = np.linspace(0, 8 * 2 * np.pi, 320)
    y = 200 + 40 * np.sin(t) + rng.normal(0, 3, size=320)
    events = _run(CycleTracker(), y)
    # Tolérance large : l'important est ~1 événement par extremum, pas 3.
    assert 6 <= events.count("bottom") <= 9
    assert 6 <= events.count("top") <= 9


def test_recorder_agrege():
    rec = SessionRecorder()
    rec.record_event(CycleEvent("bottom", {"knee": 140.0, "trunk": 42.0}))
    rec.record_event(CycleEvent("top", {"knee": 68.0, "hip": 50.0}))
    rec.record_event(CycleEvent("bottom", {"knee": 144.0, "trunk": 44.0}))
    assert rec.cycles == 2
    s = rec.summary()
    assert s["knee_bottom"] == 142.0
    assert s["knee_top"] == 68.0
    assert s["hip_top"] == 50.0
    assert s["trunk"] == 43.0
    assert "elbow" not in s  # jamais mesuré : absent du résumé
