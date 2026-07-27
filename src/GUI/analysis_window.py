"""
analysis_window.py — Fenêtre d'analyse en temps réel.

Disposition :
  ┌─────────────────────────────┬──────────────────────┐
  │                             │  Articulations       │
  │        flux webcam          │  (1 carte, lignes    │
  │     + squelette coloré      │   séparées par des   │
  │                             │   filets 1 px)       │
  │                             │  Conseils en direct  │
  │                             │  [Terminer]          │
  └─────────────────────────────┴──────────────────────┘

Choix de design :
  - UNE carte pour les 4 articulations, rangées séparées par des filets
    (pas 4 boîtes empilées : la carte n'est justifiée que par l'élévation) ;
  - valeurs en police à chasse fixe, rafraîchies 4 fois/seconde seulement
    (un chiffre qui tremble à 60 Hz est illisible et cheap) ;
  - HYSTÉRÉSIS sur l'état vert/rouge : l'angle oscille autour des bornes à
    chaque coup de pédale → sans stabilisation, la couleur clignoterait.
    On ne change l'état affiché que s'il reste identique 12 frames (~0,4 s) ;
  - transitions de vues en fondu d'alpha (pas de téléportation).

En fin de session : bilan personnalisé via Gemini (thread + repli local).
"""

import threading
import time

import cv2
import customtkinter as ctk
from PIL import Image

from src.core.pose import PoseDetector, SEGMENTS
from src.core.ranges import DEFAULT_RANGES
from src.core.angles import SessionAngles, JUDGE_STAT
from src.core.feedback import analyse_session, get_ai_feedback, JOINT_LABELS
from src.GUI import theme
from src.GUI.anim import fade_in, fade_out, Ellipsis


# Couleurs OpenCV (BGR !) dérivées du thème : une seule source de vérité.
_BGR_GREEN = theme.to_bgr(theme.GREEN)
_BGR_RED = theme.to_bgr(theme.RED)
_BGR_GRAY = theme.to_bgr(theme.GRAY)

# Libellés français des statistiques jugées.
_STAT_LABELS = {"max": "max", "min": "min", "mean": "moyenne"}

# Hystérésis : frames consécutives identiques avant de changer l'état affiché.
_STABLE_FRAMES = 12
# Rafraîchissement des textes (valeurs + conseils) : toutes les N frames.
_TEXT_EVERY = 15


class _JointRow(ctk.CTkFrame):
    """Une rangée de la carte articulations : libellé + plage | valeur + état."""

    def __init__(self, master, joint: str, angle_range):
        super().__init__(master, fg_color="transparent")

        left = ctk.CTkFrame(self, fg_color="transparent")
        left.pack(side="left", fill="x", expand=True, padx=(14, 0), pady=8)
        ctk.CTkLabel(left, text=JOINT_LABELS[joint], font=theme.FONT_BODY,
                     text_color=theme.TEXT, anchor="w").pack(fill="x")
        stat = _STAT_LABELS[JUDGE_STAT[joint]]
        cible = f"cible ({stat}) {angle_range.min_deg:.0f}–{angle_range.max_deg:.0f}°"
        ctk.CTkLabel(left, text=cible, font=theme.FONT_SMALL,
                     text_color=theme.TEXT_2, anchor="w").pack(fill="x")

        right = ctk.CTkFrame(self, fg_color="transparent")
        right.pack(side="right", padx=(0, 14))
        self._value = ctk.CTkLabel(right, text="—", font=theme.FONT_VALUE,
                                   text_color=theme.GRAY, anchor="e", width=86)
        self._value.pack(side="left")
        self._dot = ctk.CTkLabel(right, text="●", font=(theme.FAMILY, 13),
                                 text_color=theme.GRAY, width=18)
        self._dot.pack(side="left", padx=(6, 0))

    def update_row(self, value, state):
        """value : angle jugé (ou None) ; state : état STABILISÉ True/False/None."""
        if value is None or state is None:
            self._value.configure(text="—", text_color=theme.GRAY)
            self._dot.configure(text_color=theme.GRAY)
            return
        color = theme.GREEN if state else theme.RED
        self._value.configure(text=f"{value:.0f}°", text_color=color)
        self._dot.configure(text_color=color)


class AnalysisWindow(ctk.CTkToplevel):
    """Fenêtre d'analyse : vidéo à gauche, feedback temps réel à droite."""

    def __init__(self, master, ranges: dict, comment: str,
                 model_path: str, on_close=None):
        super().__init__(master, fg_color=theme.BG)
        self._ranges = ranges
        self._comment = comment
        self._on_close = on_close
        self._running = False

        # État stabilisé par articulation (hystérésis anti-clignotement).
        self._shown_state = {j: None for j in JOINT_LABELS}
        self._pending = {j: [None, 0] for j in JOINT_LABELS}  # [candidat, nb]

        # Taille d'affichage vidéo, mise en cache (winfo_* coûte cher à 60 fps).
        self._view_size = (640, 480)

        self.title("BikeFit — Analyse")
        self.geometry("1180x660")
        self.minsize(960, 560)
        self.protocol("WM_DELETE_WINDOW", self._close)

        self._build_ui()
        fade_in(self, 200)

        # --- Webcam + détecteur de pose ---
        self._cap = cv2.VideoCapture(0)
        if not self._cap.isOpened():
            self._show_camera_error()
            return

        self._detector = PoseDetector(model_path)
        self._session = SessionAngles(ranges)
        self._start = time.monotonic()   # base des timestamps LIVE_STREAM
        self._frame_count = 0

        self._running = True
        self._loop()

    # ------------------------------------------------------------------ #
    # Construction de l'interface
    # ------------------------------------------------------------------ #
    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0)
        self.grid_rowconfigure(0, weight=1)

        # --- Zone vidéo (surface sombre arrondie, pas de noir pur) ---
        video_card = ctk.CTkFrame(self, fg_color=theme.BG_DARK,
                                  corner_radius=theme.RADIUS)
        video_card.grid(row=0, column=0, sticky="nsew", padx=(16, 8), pady=16)
        video_card.grid_propagate(False)
        self._video_label = ctk.CTkLabel(video_card, text="Démarrage caméra…",
                                         text_color=theme.TEXT_2_ON_DARK)
        self._video_label.pack(expand=True, fill="both", padx=6, pady=6)
        # La taille du cadre change rarement : on la met en cache ici plutôt
        # que d'interroger winfo_width() à chaque frame.
        self._video_label.bind("<Configure>", self._on_video_resize)

        # --- Panneau de droite ---
        panel = ctk.CTkFrame(self, fg_color="transparent", width=340)
        panel.grid(row=0, column=1, sticky="nsew", padx=(8, 16), pady=16)
        panel.grid_propagate(False)

        # Carte unique des articulations : rangées + filets de séparation.
        stats_card = ctk.CTkFrame(panel, fg_color=theme.CARD,
                                  corner_radius=theme.RADIUS)
        stats_card.pack(fill="x", pady=(0, 10))
        ctk.CTkLabel(stats_card, text="ARTICULATIONS",
                     font=theme.FONT_SECTION, text_color=theme.TEXT_2,
                     anchor="w").pack(fill="x", padx=14, pady=(10, 0))
        # État honnête : si l'IA n'a pas répondu, les plages affichées sont
        # les valeurs standard — l'opérateur doit le savoir.
        if self._ranges is DEFAULT_RANGES:
            ctk.CTkLabel(stats_card,
                         text="Plages standard — personnalisation IA indisponible.",
                         font=theme.FONT_SMALL, text_color=theme.TEXT_2,
                         anchor="w").pack(fill="x", padx=14, pady=(2, 0))
        self._rows = {}
        joints = list(JOINT_LABELS)
        for i, joint in enumerate(joints):
            row = _JointRow(stats_card, joint, self._ranges[joint])
            row.pack(fill="x")
            self._rows[joint] = row
            if i < len(joints) - 1:      # filet 1 px entre les rangées
                ctk.CTkFrame(stats_card, fg_color=theme.SEPARATOR,
                             height=1).pack(fill="x", padx=14)
        ctk.CTkFrame(stats_card, fg_color="transparent",
                     height=4).pack()    # respiration basse de la carte

        # Conseils en direct (DIAGNOSTICS des angles hors plage).
        advice_card = ctk.CTkFrame(panel, fg_color=theme.CARD,
                                   corner_radius=theme.RADIUS)
        advice_card.pack(fill="both", expand=True, pady=(0, 10))
        ctk.CTkLabel(advice_card, text="CONSEILS EN DIRECT",
                     font=theme.FONT_SECTION, text_color=theme.TEXT_2,
                     anchor="w").pack(fill="x", padx=14, pady=(10, 2))
        self._advice = ctk.CTkLabel(
            advice_card, text="Pédale normalement, j'observe ta position…",
            font=theme.FONT_SMALL, text_color=theme.TEXT,
            anchor="nw", justify="left", wraplength=290)
        self._advice.pack(fill="both", expand=True, padx=14, pady=(0, 12))

        self._finish_btn = ctk.CTkButton(
            panel, text="Terminer la session",
            font=theme.FONT_BUTTON,
            corner_radius=theme.RADIUS, height=theme.BTN_HEIGHT,
            fg_color=theme.RED, hover_color=theme.RED_HOVER,
            command=self._finish)
        self._finish_btn.pack(fill="x")

    def _show_camera_error(self):
        """Webcam introuvable : état d'erreur explicite, pas de fenêtre morte.
        Le problème est nommé, la sortie aussi — le bouton devient un retour."""
        self._video_label.configure(
            text="Impossible d'ouvrir la webcam.\n\n"
                 "Branche ou autorise une caméra,\n"
                 "puis relance l'analyse depuis le questionnaire.",
            font=theme.FONT_BODY, justify="center")
        self._advice.configure(text="Analyse impossible sans caméra.")
        self._finish_btn.configure(text="Retour au questionnaire",
                                   fg_color=theme.ACCENT,
                                   hover_color=theme.ACCENT_HOVER,
                                   command=self._close)

    def _on_video_resize(self, event):
        if event.width > 50 and event.height > 50:
            self._view_size = (event.width, event.height)

    # ------------------------------------------------------------------ #
    # Boucle vidéo
    # ------------------------------------------------------------------ #
    def _loop(self):
        if not self._running:
            return

        ok, frame = self._cap.read()
        if ok:
            frame = cv2.flip(frame, 1)   # effet miroir, plus naturel

            timestamp_ms = int((time.monotonic() - self._start) * 1000)
            self._detector.send(frame, timestamp_ms)
            joints = self._detector.latest(frame.shape)

            if joints is not None:
                self._session.update(joints)
                self._update_hysteresis()
                self._draw_skeleton(frame, joints)

            # Les TEXTES se rafraîchissent 4 fois/seconde : un chiffre qui
            # change à 60 Hz tremble et fatigue l'œil. La vidéo, elle, reste
            # à pleine cadence.
            self._frame_count += 1
            if self._frame_count % _TEXT_EVERY == 0:
                self._update_rows()
                self._update_advice()

            self._show_frame(frame)

        self.after(15, self._loop)

    def _update_hysteresis(self):
        """Stabilise l'état vert/rouge : l'angle frôle les bornes à chaque
        coup de pédale, sans ce filtre la couleur clignoterait à 60 Hz."""
        for joint in self._shown_state:
            raw = self._session.is_ok(joint)      # True / False / None
            if raw == self._shown_state[joint]:
                self._pending[joint] = [None, 0]  # rien à changer
                continue
            candidate, count = self._pending[joint]
            if raw == candidate:
                count += 1
            else:
                candidate, count = raw, 1
            if count >= _STABLE_FRAMES:
                self._shown_state[joint] = candidate
                self._pending[joint] = [None, 0]
            else:
                self._pending[joint] = [candidate, count]

    def _joint_color(self, joint: str):
        """Couleur BGR du squelette selon l'état STABILISÉ de l'articulation."""
        if joint not in self._ranges:
            return _BGR_GRAY             # wrist, ankle : pas d'angle jugé
        state = self._shown_state[joint]
        if state is None:
            return _BGR_GRAY
        return _BGR_GREEN if state else _BGR_RED

    def _draw_skeleton(self, frame, joints):
        for name_a, name_b in SEGMENTS:
            cv2.line(frame, joints[name_a], joints[name_b],
                     self._joint_color(name_b), 3)
        for name, (x, y) in joints.items():
            cv2.circle(frame, (x, y), 6, self._joint_color(name), -1)

    def _show_frame(self, frame_bgr):
        """Frame OpenCV (BGR) → image customtkinter, ratio préservé."""
        label_w, label_h = self._view_size
        h, w = frame_bgr.shape[:2]
        scale = min(label_w / w, label_h / h)
        size = (int(w * scale), int(h * scale))

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        image = ctk.CTkImage(light_image=Image.fromarray(rgb), size=size)
        self._video_label.configure(image=image, text="")
        self._video_label._image_ref = image   # évite le garbage collector

    def _update_rows(self):
        for joint, row in self._rows.items():
            row.update_row(self._session.judged_value(joint),
                           self._shown_state[joint])

    def _update_advice(self):
        findings = analyse_session(self._session, self._ranges)
        advices = [f["advice"] for f in findings if f["advice"]]
        if not findings:
            text = "Pédale normalement, j'observe ta position…"
        elif not advices:
            text = "Position dans les plages cibles. Continue comme ça."
        else:
            text = "\n\n".join(f"— {a}" for a in advices)
        self._advice.configure(text=text)

    # ------------------------------------------------------------------ #
    # Fin de session : bilan IA
    # ------------------------------------------------------------------ #
    def _finish(self):
        if not self._running:
            return
        self._running = False
        findings = analyse_session(self._session, self._ranges)
        self._release_camera()

        # Crossfade : fondu de sortie → reconstruction → fondu d'entrée.
        # Sans ça, la vue « analyse » se téléporterait en vue « bilan ».
        fade_out(self, 120, then=lambda: self._enter_report(findings))

    def _enter_report(self, findings):
        self._show_report_view()
        fade_in(self, 180)
        threading.Thread(target=self._fetch_report, args=(findings,),
                         daemon=True).start()

    def _fetch_report(self, findings):
        report = get_ai_feedback(findings, comment=self._comment)
        self.after(0, lambda: self._report_ready(report))

    def _show_report_view(self):
        """Remplace tout le contenu de la fenêtre par la vue « Bilan »."""
        for child in self.winfo_children():
            child.destroy()
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0)   # annule la colonne panneau
        self.grid_rowconfigure(0, weight=1)

        wrapper = ctk.CTkFrame(self, fg_color="transparent")
        wrapper.grid(row=0, column=0, sticky="nsew", padx=60, pady=24)

        ctk.CTkLabel(wrapper, text="Bilan de séance", font=theme.FONT_TITLE,
                     text_color=theme.TEXT, anchor="w").pack(fill="x", pady=(6, 14))

        card = ctk.CTkFrame(wrapper, fg_color=theme.CARD,
                            corner_radius=theme.RADIUS)
        card.pack(fill="both", expand=True)

        # Attente : ellipse animée tant que Gemini n'a pas répondu.
        self._report_status = ctk.CTkLabel(
            card, text="Génération du bilan personnalisé…",
            font=theme.FONT_BODY, text_color=theme.TEXT_2, anchor="w")
        self._report_status.pack(fill="x", padx=16, pady=(16, 0))
        self._dots = Ellipsis(self._report_status,
                              "Génération du bilan personnalisé")
        self._dots.start()

        self._report_box = ctk.CTkTextbox(
            card, font=theme.FONT_BODY, text_color=theme.TEXT,
            fg_color=theme.CARD, wrap="word", border_width=0)
        self._report_box.pack(fill="both", expand=True, padx=16, pady=16)
        self._report_box.configure(state="disabled")

        ctk.CTkButton(wrapper, text="Fermer",
                      font=theme.FONT_BUTTON,
                      corner_radius=theme.RADIUS, height=theme.BTN_HEIGHT,
                      fg_color=theme.ACCENT, hover_color=theme.ACCENT_HOVER,
                      command=self._close).pack(fill="x", pady=(16, 0))

    def _report_ready(self, report: str):
        if not self.winfo_exists():
            return
        self._dots.stop()
        self._report_status.destroy()
        self._report_box.configure(state="normal")
        self._report_box.delete("1.0", "end")
        self._report_box.insert("1.0", report)
        self._report_box.configure(state="disabled")

    # ------------------------------------------------------------------ #
    # Fermeture propre
    # ------------------------------------------------------------------ #
    def _release_camera(self):
        if getattr(self, "_cap", None) is not None and self._cap.isOpened():
            self._cap.release()
        if getattr(self, "_detector", None) is not None:
            self._detector.close()
            self._detector = None

    def _close(self):
        self._running = False
        self._release_camera()
        self.destroy()
        if self._on_close:
            self._on_close()
