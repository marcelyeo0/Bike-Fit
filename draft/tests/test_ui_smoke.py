"""Smoke test de l'interface : construction des pages sans crash.

Tourne hors écran (plateforme Qt « offscreen ») : vérifie que les imports,
la feuille de style et la construction des widgets sont sains, sans ouvrir
de fenêtre ni de caméra. Le comportement temps réel se vérifie à la main.
"""

import os

import numpy as np
import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

pytest.importorskip("PySide6")


@pytest.fixture(scope="module")
def app():
    from PySide6.QtWidgets import QApplication
    application = QApplication.instance() or QApplication([])
    yield application


def test_main_window_se_construit(app):
    from draft.ui.main_window import MainWindow
    from draft.ui.theme import STYLESHEET
    app.setStyleSheet(STYLESHEET)
    window = MainWindow()
    assert window.windowTitle() == "BikeFit AI"


def test_video_view_affiche_une_frame(app):
    from draft.ui.video_view import VideoView
    view = VideoView()
    view.show_frame(np.zeros((240, 320, 3), dtype=np.uint8))
    assert view._pixmap is not None


def test_console_recoit_une_recommandation(app):
    from draft.analysis.recommender import Recommendation
    from draft.ui.fit_pages import FitLivePage
    page = FitLivePage()
    page.set_mode("confort")
    page.add_recommendation(Recommendation(
        metric="knee_bottom", severity="warn",
        message="Genou trop tendu : descendre la selle d'environ 10 mm."))
    assert page.console.count() == 1


def test_tunnel_page_se_construit(app):
    from draft.ui.tunnel_page import TunnelPage
    page = TunnelPage()
    # Sans vidéo importée : contrôles désactivés, pas d'animation.
    assert not page._slider.isEnabled()
    assert not page._launch.isEnabled()
    assert not page._timer.isActive()
    page.shutdown()


def test_demo_soufflerie_de_bout_en_bout(app):
    # Activer la démo génère la scène et lance le calcul tout seul ;
    # une fois le worker terminé, l'animation doit tourner avec un score.
    from draft.ui.tunnel_page import TunnelPage
    page = TunnelPage()
    page._set_active("DEMO")
    slot = page._slots["DEMO"]
    assert slot.frame is not None and slot.mask is not None
    assert page._worker is not None
    assert page._worker.wait(30000)
    app.processEvents()  # délivre le signal result_ready (inter-threads)
    assert slot.result is not None
    assert page._timer.isActive()
    assert page._score_label.text() != "—"
    page.shutdown()


def test_overlay_dessine_sans_crash():
    from draft.ui import overlay
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    lm = {
        "shoulder": np.array([200.0, 100.0]), "elbow": np.array([300.0, 160.0]),
        "wrist": np.array([380.0, 220.0]), "hip": np.array([220.0, 260.0]),
        "knee": np.array([280.0, 360.0]), "ankle": np.array([240.0, 440.0]),
        "heel": np.array([230.0, 455.0]), "foot": np.array([280.0, 460.0]),
    }
    from draft.analysis.geometry import compute_joint_angles
    angles = compute_joint_angles(lm)
    overlay.draw_skeleton(frame, lm)
    overlay.draw_angles(frame, lm, angles)
    overlay.draw_status(frame, "test")
    assert frame.sum() > 0  # quelque chose a bien été dessiné
