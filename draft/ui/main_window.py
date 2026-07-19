"""Fenêtre principale : navigation entre les pages via un QStackedWidget.

Un seul logiciel, pas deux scripts : l'accueil route vers le mode Analyse
posturale ou la Soufflerie virtuelle, qui partagent pose/ et les widgets
communs (VideoView, thème). Le QStackedWidget empile les pages et n'en
montre qu'une — plus simple à gérer que des fenêtres multiples (une seule
boucle d'événements, pas de fenêtres orphelines).
"""

from __future__ import annotations

from PySide6.QtWidgets import QMainWindow, QMessageBox, QStackedWidget

from draft.analysis.report import build_report
from draft.ui.fit_pages import FitLivePage, FitSetupPage
from draft.ui.fit_worker import FitWorker
from draft.ui.home import HomePage
from draft.ui.tunnel_page import TunnelPage


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("BikeFit AI")
        self.resize(1280, 760)

        self._stack = QStackedWidget()
        self.setCentralWidget(self._stack)

        self._home = HomePage()
        self._fit_setup = FitSetupPage()
        self._fit_live = FitLivePage()
        self._tunnel = TunnelPage()
        for page in (self._home, self._fit_setup, self._fit_live, self._tunnel):
            self._stack.addWidget(page)

        self._worker: FitWorker | None = None
        self._current_mode = "performance"

        # Navigation
        self._home.fit_requested.connect(
            lambda: self._stack.setCurrentWidget(self._fit_setup))
        self._home.tunnel_requested.connect(self._open_tunnel)
        self._fit_setup.back_requested.connect(self._go_home)
        self._fit_setup.start_requested.connect(self._start_fit)
        self._fit_live.finish_requested.connect(self._finish_fit)
        self._tunnel.back_requested.connect(self._go_home)

    # ---- Mode analyse posturale ----

    def _start_fit(self, mode: str, camera_index: int) -> None:
        self._current_mode = mode
        self._fit_live.set_mode(mode)
        self._fit_live.clear_console()
        self._fit_live.add_info("Pédalez à cadence régulière ; les "
                                "recommandations apparaissent ici.")
        self._stack.setCurrentWidget(self._fit_live)

        self._worker = FitWorker(mode, camera_index)
        self._worker.frame_ready.connect(self._fit_live.video.show_frame)
        self._worker.recommendation.connect(self._fit_live.add_recommendation)
        self._worker.session_done.connect(self._show_report)
        self._worker.error.connect(self._on_worker_error)
        self._worker.start()

    def _finish_fit(self) -> None:
        """Bouton « Terminer l'analyse » : arrêt propre de la capture."""
        if self._worker is not None:
            self._worker.stop()  # le rapport arrive via session_done

    def _show_report(self, summary: dict, cycles: int) -> None:
        self._wait_worker()
        report = build_report(summary, cycles, self._current_mode)
        box = QMessageBox(self)
        box.setWindowTitle("Rapport de session")
        box.setText(report)
        box.exec()
        self._go_home()

    def _on_worker_error(self, message: str) -> None:
        self._wait_worker()
        QMessageBox.warning(self, "BikeFit AI", message)
        self._go_home()

    def _wait_worker(self) -> None:
        if self._worker is not None:
            self._worker.stop()
            self._worker.wait(3000)
            self._worker = None

    # ---- Mode soufflerie ----

    def _open_tunnel(self) -> None:
        self._stack.setCurrentWidget(self._tunnel)

    # ---- Commun ----

    def _go_home(self) -> None:
        self._stack.setCurrentWidget(self._home)

    def closeEvent(self, event) -> None:
        """Fermeture de la fenêtre pendant une analyse : arrêt propre."""
        self._wait_worker()
        self._tunnel.shutdown()
        super().closeEvent(event)
