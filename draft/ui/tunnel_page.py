"""Page Soufflerie virtuelle (Phase 2).

Disposition maquette assets/ : import de deux vidéos (Position A / B) à
gauche, visionneuse au centre (frame choisie au curseur, puis animation du
flux), score de traînée et comparaison A/B à droite.

Boucle d'usage prévue avec le client du vélociste : importer la vidéo de
la position actuelle (A), lancer la soufflerie, régler le vélo, filmer à
nouveau (B), comparer les deux scores.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtWidgets import (QButtonGroup, QFileDialog, QFrame, QHBoxLayout,
                               QLabel, QMessageBox, QPushButton, QSlider,
                               QVBoxLayout, QWidget)

from draft.pose.video import VideoSource
from draft.ui.theme import ACCENT
from draft.ui.tunnel_worker import TunnelResult, TunnelWorker
from draft.ui.video_view import VideoView
from draft.windtunnel.demo import generic_cyclist_scene
from draft.windtunnel.drag import compare_drag
from draft.windtunnel.render import ParticleField, render_tunnel_frame

_ANIMATION_INTERVAL_MS = 40  # ~25 images/s, suffisant pour des filets d'air


@dataclass
class _Slot:
    """État d'une position (A, B ou démo)."""
    name: str
    source: VideoSource | None = None
    frame_index: int = 0
    frame: object = None                 # np.ndarray BGR affichée
    result: TunnelResult | None = None
    particles: ParticleField | None = field(default=None)
    mask: object = None                  # silhouette pré-calculée (démo)
    demo: bool = False                   # scène générée, rendu sans teinte

    def release(self) -> None:
        if self.source is not None:
            self.source.release()
            self.source = None


class TunnelPage(QWidget):
    back_requested = Signal()

    def __init__(self):
        super().__init__()
        self._slots = {"A": _Slot("A"), "B": _Slot("B"),
                       "DEMO": _Slot("Démo", demo=True)}
        self._active = "A"
        self._worker: TunnelWorker | None = None
        self._timer = QTimer(self)
        self._timer.setInterval(_ANIMATION_INTERVAL_MS)
        self._timer.timeout.connect(self._animate)

        layout = QHBoxLayout(self)
        layout.setSpacing(12)
        layout.addWidget(self._build_left_panel())
        layout.addLayout(self._build_center(), stretch=1)
        layout.addWidget(self._build_right_panel())

    # ---- Construction de l'interface ----

    def _build_left_panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("panel")
        panel.setFixedWidth(230)
        box = QVBoxLayout(panel)
        box.setSpacing(10)

        self._slot_buttons = QButtonGroup(self)
        self._slot_status: dict[str, QLabel] = {}
        for i, name in enumerate(("A", "B")):
            select = QPushButton(f"Position {name}")
            select.setObjectName("card")
            select.setCheckable(True)
            select.setProperty("slot", name)
            self._slot_buttons.addButton(select, i)
            box.addWidget(select)

            status = QLabel("aucune vidéo")
            status.setObjectName("dim")
            status.setWordWrap(True)
            self._slot_status[name] = status
            box.addWidget(status)

            import_btn = QPushButton("Importer une vidéo…")
            import_btn.clicked.connect(lambda _=False, n=name: self._import(n))
            box.addWidget(import_btn)

        # Option démo : flux d'air sur un cycliste générique, sans vidéo.
        demo_btn = QPushButton("🚴 Démo — cycliste générique")
        demo_btn.setObjectName("card")
        demo_btn.setCheckable(True)
        demo_btn.setProperty("slot", "DEMO")
        self._slot_buttons.addButton(demo_btn, 2)
        box.addWidget(demo_btn)
        demo_hint = QLabel("Silhouette générée en position aéro — pour "
                           "montrer le principe au client sans vidéo.")
        demo_hint.setObjectName("dim")
        demo_hint.setWordWrap(True)
        box.addWidget(demo_hint)

        self._slot_buttons.buttons()[0].setChecked(True)
        self._slot_buttons.idClicked.connect(self._on_slot_selected)

        box.addStretch()
        back = QPushButton("← Accueil")
        back.clicked.connect(self._on_back)
        box.addWidget(back)
        return panel

    def _build_center(self) -> QVBoxLayout:
        center = QVBoxLayout()
        title = QLabel("💨 Soufflerie virtuelle")
        title.setObjectName("pageTitle")
        center.addWidget(title)

        self.video = VideoView("Importez une vidéo du cycliste de profil.")
        center.addWidget(self.video, stretch=1)

        self._slider = QSlider(Qt.Horizontal)
        self._slider.setEnabled(False)
        self._slider.valueChanged.connect(self._on_scrub)
        center.addWidget(self._slider)

        self._launch = QPushButton("Lancer la soufflerie")
        self._launch.setObjectName("primary")
        self._launch.setEnabled(False)
        self._launch.clicked.connect(self._on_launch)
        center.addWidget(self._launch)
        return center

    def _build_right_panel(self) -> QFrame:
        panel = QFrame()
        panel.setObjectName("panel")
        panel.setFixedWidth(230)
        box = QVBoxLayout(panel)
        box.setSpacing(8)

        title = QLabel("Drag score")
        title.setObjectName("pageTitle")
        title.setAlignment(Qt.AlignCenter)
        box.addWidget(title)

        self._score_label = QLabel("—")
        self._score_label.setAlignment(Qt.AlignCenter)
        self._score_label.setStyleSheet(
            f"font-size: 44px; font-weight: 800; color: {ACCENT};")
        box.addWidget(self._score_label)

        hint = QLabel("Indice relatif : sert à comparer deux positions du "
                      "même cycliste, pas à donner des watts.")
        hint.setObjectName("dim")
        hint.setWordWrap(True)
        box.addWidget(hint)

        box.addSpacing(12)
        self._ab_labels: dict[str, QLabel] = {}
        for name in ("A", "B"):
            label = QLabel(f"Position {name} : —")
            self._ab_labels[name] = label
            box.addWidget(label)

        self._compare_label = QLabel("")
        self._compare_label.setWordWrap(True)
        self._compare_label.setStyleSheet(f"color: {ACCENT}; font-weight: 600;")
        box.addWidget(self._compare_label)
        box.addStretch()
        return panel

    # ---- Interactions ----

    def _import(self, slot_name: str) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self, f"Vidéo de la position {slot_name}", "",
            "Vidéos (*.mp4 *.mov *.avi *.mkv *.webm)")
        if not path:
            return
        slot = self._slots[slot_name]
        slot.release()
        try:
            slot.source = VideoSource(path)
        except RuntimeError as exc:
            QMessageBox.warning(self, "BikeFit AI", str(exc))
            return
        slot.result = None
        slot.particles = None
        # Frame du milieu par défaut : le cycliste y est en général installé.
        slot.frame_index = max(slot.source.frame_count // 2, 0)
        slot.frame = slot.source.seek(slot.frame_index)
        self._slot_status[slot_name].setText(path.split("/")[-1].split("\\")[-1])
        self._set_active(slot_name)

    def _on_slot_selected(self, button_id: int) -> None:
        self._set_active(self._slot_buttons.button(button_id).property("slot"))

    def _set_active(self, slot_name: str) -> None:
        self._active = slot_name
        for button in self._slot_buttons.buttons():
            button.setChecked(button.property("slot") == slot_name)
        self._timer.stop()
        slot = self._slots[slot_name]

        # Démo : la scène est générée à la première activation, puis le
        # calcul du flux part tout seul (pas de vidéo à choisir).
        auto_launch = False
        if slot.demo and slot.frame is None:
            slot.frame, slot.mask = generic_cyclist_scene()
            auto_launch = True

        has_video = slot.source is not None
        self._slider.setEnabled(has_video)
        self._launch.setEnabled(slot.frame is not None
                                and self._worker is None)
        if has_video:
            self._slider.blockSignals(True)  # ne pas déclencher _on_scrub
            self._slider.setRange(0, max(slot.source.frame_count - 1, 0))
            self._slider.setValue(slot.frame_index)
            self._slider.blockSignals(False)

        if slot.result is not None:
            self._timer.start()          # reprend l'animation de ce slot
        elif slot.frame is not None:
            self.video.show_frame(slot.frame)
        self._refresh_scores()
        if auto_launch:
            self._on_launch()

    def _on_scrub(self, value: int) -> None:
        slot = self._slots[self._active]
        if slot.source is None:
            return
        slot.frame_index = value
        frame = slot.source.seek(value)
        if frame is None:
            return
        slot.frame = frame
        # Changer de frame invalide le calcul précédent de CE slot.
        self._timer.stop()
        slot.result = None
        slot.particles = None
        self.video.show_frame(frame)
        self._refresh_scores()

    def _on_launch(self) -> None:
        slot = self._slots[self._active]
        if slot.frame is None or self._worker is not None:
            return
        self._launch.setEnabled(False)
        self._launch.setText("Calcul du flux en cours…")
        self._worker = TunnelWorker(slot.frame, mask=slot.mask)
        self._worker.result_ready.connect(self._on_result)
        self._worker.error.connect(self._on_error)
        self._worker.finished.connect(self._on_worker_finished)
        self._worker.start()

    def _on_result(self, result: TunnelResult) -> None:
        slot = self._slots[self._active]
        slot.result = result
        slot.particles = ParticleField(result.flow)
        self._refresh_scores()
        self._timer.start()

    def _on_error(self, message: str) -> None:
        QMessageBox.warning(self, "Soufflerie virtuelle", message)

    def _on_worker_finished(self) -> None:
        self._worker = None
        self._launch.setText("Lancer la soufflerie")
        self._launch.setEnabled(self._slots[self._active].frame is not None)

    def _animate(self) -> None:
        slot = self._slots[self._active]
        if slot.result is None or slot.particles is None:
            self._timer.stop()
            return
        slot.particles.step()
        # La scène démo est déjà stylisée : pas d'assombrissement ni de teinte.
        frame = render_tunnel_frame(slot.result.base_frame, slot.result.flow,
                                    slot.result.mask, slot.particles,
                                    dim=1.0 if slot.demo else 0.35,
                                    tint_person=not slot.demo)
        self.video.show_frame(frame)

    def _refresh_scores(self) -> None:
        active_result = self._slots[self._active].result
        self._score_label.setText(
            str(active_result.drag.score) if active_result else "—")
        for name in ("A", "B"):  # la démo a son score, mais pas de ligne A/B
            slot = self._slots[name]
            score = str(slot.result.drag.score) if slot.result else "—"
            self._ab_labels[name].setText(f"Position {name} : {score}")
        a, b = self._slots["A"].result, self._slots["B"].result
        self._compare_label.setText(
            compare_drag(a.drag, b.drag) if a and b else "")

    def _on_back(self) -> None:
        self._timer.stop()
        self.back_requested.emit()

    def shutdown(self) -> None:
        """Arrêt propre (fermeture de l'application)."""
        self._timer.stop()
        if self._worker is not None:
            self._worker.wait(3000)
            self._worker = None
        for slot in self._slots.values():
            slot.release()
