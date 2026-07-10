"""Thread d'analyse posturale : caméra → pose → angles → recommandations.

Pourquoi un QThread : la boucle caméra+MediaPipe prend ~30 ms par frame.
Dans le thread principal, elle gèlerait l'interface (boutons morts, fenêtre
« ne répond pas »). Le worker tourne à côté et pousse ses résultats via des
signaux Qt — mécanisme thread-safe fourni par Qt, aucune file d'attente à
écrire soi-même. Équivalent C++ : std::thread + file de messages.
"""

from __future__ import annotations

import time

from PySide6.QtCore import QThread, Signal

from pose.video import VideoSource
from pose.mediapipe_estimator import MediaPipeEstimator
from analysis.geometry import compute_joint_angles
from analysis.filters import LandmarkSmoother
from analysis.session import CycleEvent, CycleTracker, SessionRecorder
from analysis.recommender import evaluate
from ui import overlay

# Une même recommandation n'est répétée dans la console qu'après ce délai :
# sans cela, un défaut de posture stable spammerait un message par coup de
# pédale (cf. la console de la maquette, volontairement non imitée ici).
_REPEAT_COOLDOWN_S = 8.0


class FitWorker(QThread):
    frame_ready = Signal(object)          # np.ndarray BGR annotée
    recommendation = Signal(object)       # Recommendation
    session_done = Signal(dict, int)      # résumé des mesures, nb de cycles
    error = Signal(str)

    def __init__(self, mode: str, camera_index: int = 0, parent=None):
        super().__init__(parent)
        self._mode = mode
        self._camera_index = camera_index
        self._stop_requested = False

    def stop(self) -> None:
        """Demande d'arrêt propre (testée à chaque frame)."""
        self._stop_requested = True

    def run(self) -> None:  # exécuté dans le thread secondaire
        try:
            source = VideoSource(self._camera_index)
        except RuntimeError as exc:
            self.error.emit(str(exc))
            return

        # Phase 1 : pas besoin du masque de segmentation → on le désactive,
        # MediaPipe gagne ~20 % de temps par frame.
        estimator = MediaPipeEstimator(with_mask=False)
        smoother = LandmarkSmoother(alpha=0.4)
        tracker = CycleTracker()
        recorder = SessionRecorder()
        last_emitted: dict[str, tuple[str, float]] = {}  # metric -> (msg, t)

        try:
            while not self._stop_requested:
                frame = source.read()
                if frame is None:
                    self.error.emit("Caméra déconnectée.")
                    break

                pose = estimator.process(frame)
                if pose is None or not pose.has("hip", "knee", "ankle"):
                    overlay.draw_status(frame, "Cycliste non détecté — "
                                        "vérifiez le cadrage de profil")
                    self.frame_ready.emit(frame)
                    continue

                lm = smoother.update(pose.landmarks)
                angles = compute_joint_angles(lm)
                overlay.draw_skeleton(frame, lm)
                overlay.draw_angles(frame, lm, angles)
                overlay.draw_status(
                    frame, f"Analyse en cours — {recorder.cycles} cycle(s) de "
                           f"pédalage détecté(s)")
                self.frame_ready.emit(frame)

                event_kind = tracker.update(float(lm["ankle"][1]))
                if event_kind is None:
                    continue
                recorder.record_event(CycleEvent(event_kind, angles))
                self._emit_live_recos(event_kind, angles, last_emitted)
        finally:
            estimator.close()
            source.release()

        summary = recorder.summary()
        self.session_done.emit(summary, recorder.cycles)

    def _emit_live_recos(self, event_kind: str, angles: dict[str, float],
                         last_emitted: dict[str, tuple[str, float]]) -> None:
        """Évalue les mesures de l'instant et pousse les alertes (dédupliquées).

        Aux points morts uniquement : c'est là que knee_bottom/knee_top ont
        un sens. Les métriques continues (dos, coude) sont jointes au passage.
        """
        measures: dict[str, float] = {}
        if event_kind == "bottom" and "knee" in angles:
            measures["knee_bottom"] = angles["knee"]
        if event_kind == "top":
            if "knee" in angles:
                measures["knee_top"] = angles["knee"]
            if "hip" in angles:
                measures["hip_top"] = angles["hip"]
        for metric in ("trunk", "elbow"):
            if metric in angles:
                measures[metric] = angles[metric]

        now = time.monotonic()
        for reco in evaluate(measures, self._mode):
            if reco.severity != "warn":
                continue  # le « tout est conforme » est réservé au rapport final
            previous = last_emitted.get(reco.metric)
            if previous and previous[0] == reco.message \
                    and now - previous[1] < _REPEAT_COOLDOWN_S:
                continue
            last_emitted[reco.metric] = (reco.message, now)
            self.recommendation.emit(reco)
