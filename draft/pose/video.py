"""Sources vidéo : webcam ou fichier, derrière la même interface.

Les deux modes du logiciel s'en servent : l'analyse posturale ouvre une
webcam (index entier), la soufflerie ouvre un fichier importé (chemin).
"""

from __future__ import annotations

import numpy as np
import cv2


class VideoSource:
    """Enveloppe mince autour de cv2.VideoCapture, sans dépendance Qt."""

    def __init__(self, source: int | str):
        self._source = source
        # CAP_DSHOW évite plusieurs secondes de latence à l'ouverture
        # d'une webcam sous Windows (backend MSMF par défaut trop lent).
        if isinstance(source, int):
            self._cap = cv2.VideoCapture(source, cv2.CAP_DSHOW)
        else:
            self._cap = cv2.VideoCapture(str(source))
        if not self._cap.isOpened():
            raise RuntimeError(f"Impossible d'ouvrir la source vidéo : {source!r}")

    @property
    def fps(self) -> float:
        fps = self._cap.get(cv2.CAP_PROP_FPS)
        return fps if fps and fps > 0 else 30.0

    @property
    def frame_count(self) -> int:
        """Nombre de frames (0 pour une webcam)."""
        n = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT))
        return max(n, 0)

    def read(self) -> np.ndarray | None:
        """Frame BGR suivante, ou None (fin de fichier / caméra débranchée)."""
        ok, frame = self._cap.read()
        return frame if ok else None

    def seek(self, frame_index: int) -> np.ndarray | None:
        """Se positionne sur une frame précise (fichiers uniquement)."""
        self._cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        return self.read()

    def release(self) -> None:
        self._cap.release()

    def __enter__(self) -> "VideoSource":
        return self

    def __exit__(self, *exc) -> None:
        self.release()
