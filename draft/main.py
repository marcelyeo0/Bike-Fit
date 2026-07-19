"""BikeFit AI — point d'entrée.

Lance l'application Qt : écran d'accueil, puis mode Analyse posturale ou
Soufflerie virtuelle. Voir README.md pour l'architecture et .claude/notes.md
pour le journal des décisions techniques.
"""

import sys

from PySide6.QtWidgets import QApplication

from draft.ui.main_window import MainWindow
from draft.ui.theme import STYLESHEET


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName("BikeFit AI")
    app.setStyleSheet(STYLESHEET)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
