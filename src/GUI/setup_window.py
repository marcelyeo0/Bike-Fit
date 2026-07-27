"""
setup_window.py — Questionnaire de départ, layout split-screen asymétrique.

  ┌───────────────┬──────────────────────────┐
  │  panneau      │  TON VÉLO      [segmenté]│
  │  sombre       │  POSITION      [segmenté]│
  │  BikeFit      │  REMARQUES     [textbox] │
  │  (marque,     │                          │
  │   ancré bas)  │  [Calculer mes plages]   │
  └───────────────┴──────────────────────────┘

Le panneau de marque est ancré en BAS à gauche (asymétrie assumée : la
zone haute reste vide, ça respire). Le formulaire suit la règle
« label au-dessus du champ » avec un état de chargement explicite sur
le bouton pendant l'appel API.

À la validation : appel API (ranges.get_target_ranges) dans un THREAD,
puis callback on_profile_ready(profile, ranges) vers main.py.
"""

import threading

import customtkinter as ctk

from src.core.ranges import get_target_ranges
from src.GUI import theme
from src.GUI.anim import fade_in


class SetupWindow(ctk.CTk):
    """Fenêtre principale : questionnaire avant l'analyse."""

    def __init__(self, on_profile_ready):
        super().__init__(fg_color=theme.BG)
        self._on_profile_ready = on_profile_ready

        self.title("BikeFit")
        self.geometry("920x600")
        self.resizable(False, False)

        self._build_ui()
        fade_in(self, 200)

    # ------------------------------------------------------------------ #
    # Construction de l'interface
    # ------------------------------------------------------------------ #
    def _build_ui(self):
        # 2 colonnes asymétriques : marque 2fr / formulaire 3fr.
        self.grid_columnconfigure(0, weight=2, uniform="cols")
        self.grid_columnconfigure(1, weight=3, uniform="cols")
        self.grid_rowconfigure(0, weight=1)

        self._build_brand_panel()
        self._build_form_panel()

    def _build_brand_panel(self):
        """Panneau sombre gauche : la marque, ancrée en bas (asymétrie)."""
        panel = ctk.CTkFrame(self, fg_color=theme.BG_DARK, corner_radius=0)
        panel.grid(row=0, column=0, sticky="nsew")
        # Tout est poussé vers le bas : la zone vide au-dessus fait partie
        # du design (espace négatif volontaire, rien à combler).
        panel.grid_rowconfigure(0, weight=1)
        panel.grid_rowconfigure(1, weight=0)
        panel.grid_columnconfigure(0, weight=1)

        block = ctk.CTkFrame(panel, fg_color="transparent")
        block.grid(row=1, column=0, sticky="sw", padx=36, pady=36)

        ctk.CTkLabel(block, text="BikeFit", font=theme.FONT_DISPLAY,
                     text_color=theme.TEXT_ON_DARK, anchor="w"
                     ).pack(anchor="w")
        ctk.CTkLabel(block,
                     text="Analyse posturale en temps réel.\n"
                          "Ta position, mesurée et corrigée.",
                     font=theme.FONT_SUBTITLE, justify="left",
                     text_color=theme.TEXT_2_ON_DARK, anchor="w"
                     ).pack(anchor="w", pady=(8, 0))
        # Filet accent : discret repère de marque, pas un glow.
        ctk.CTkFrame(block, fg_color=theme.ACCENT, height=3, width=48,
                     corner_radius=2).pack(anchor="w", pady=(16, 0))

    def _build_form_panel(self):
        """Colonne droite : le formulaire, labels au-dessus des champs."""
        form = ctk.CTkFrame(self, fg_color="transparent")
        form.grid(row=0, column=1, sticky="nsew", padx=40, pady=36)

        ctk.CTkLabel(form, text="Ton profil", font=theme.FONT_TITLE,
                     text_color=theme.TEXT, anchor="w").pack(fill="x")
        ctk.CTkLabel(form,
                     text="Trois réponses suffisent pour calculer tes plages "
                          "d'angles cibles.",
                     font=theme.FONT_SMALL, text_color=theme.TEXT_2,
                     anchor="w").pack(fill="x", pady=(2, 18))

        self._bike = self._segmented_field(
            form, "TON VÉLO", ["Route", "Gravel", "VTT", "Ville"], "Route")
        self._position = self._segmented_field(
            form, "POSITION RECHERCHÉE", ["Confort", "Mixte", "Aéro"], "Mixte")

        # --- Remarques / douleurs (label au-dessus, aide en dessous) ---
        ctk.CTkLabel(form, text="REMARQUES / DOULEURS",
                     font=theme.FONT_SECTION, text_color=theme.TEXT_2,
                     anchor="w").pack(fill="x", pady=(14, 4))
        self._comment = ctk.CTkTextbox(
            form, height=88, corner_radius=10,
            font=theme.FONT_BODY, text_color=theme.TEXT,
            fg_color=theme.CARD, border_width=1,
            border_color=theme.SEPARATOR, wrap="word")
        self._comment.pack(fill="x")
        ctk.CTkLabel(form,
                     text="Optionnel — l'IA en tient compte pour ajuster "
                          "tes plages (ex. douleur au genou droit).",
                     font=theme.FONT_SMALL, text_color=theme.TEXT_2,
                     anchor="w", wraplength=440, justify="left"
                     ).pack(fill="x", pady=(4, 0))

        # --- Bouton principal + état ---
        self._button = ctk.CTkButton(
            form, text="Calculer mes plages d'angles",
            font=(theme.FAMILY, 15, "bold"),
            corner_radius=theme.RADIUS, height=48,
            fg_color=theme.ACCENT, hover_color=theme.ACCENT_HOVER,
            command=self._submit)
        self._button.pack(fill="x", pady=(22, 6))

        self._status = ctk.CTkLabel(form, text="", font=theme.FONT_SMALL,
                                    text_color=theme.TEXT_2, anchor="w")
        self._status.pack(fill="x")

    def _segmented_field(self, parent, label: str, values: list, default: str):
        """Un champ « label au-dessus + choix segmenté », renvoie le widget."""
        ctk.CTkLabel(parent, text=label, font=theme.FONT_SECTION,
                     text_color=theme.TEXT_2, anchor="w"
                     ).pack(fill="x", pady=(14, 4))
        seg = ctk.CTkSegmentedButton(
            parent, values=values, font=theme.FONT_BODY,
            corner_radius=10, height=36,
            selected_color=theme.ACCENT, selected_hover_color=theme.ACCENT_HOVER,
            unselected_color=theme.CARD, unselected_hover_color=theme.SEPARATOR,
            fg_color=theme.SEPARATOR, text_color=theme.TEXT)
        seg.set(default)
        seg.pack(fill="x")
        return seg

    # ------------------------------------------------------------------ #
    # Validation : appel API dans un thread
    # ------------------------------------------------------------------ #
    def _submit(self):
        profile = {
            "bike_type": self._bike.get().lower(),
            "position": self._position.get().lower(),
            "comment": self._comment.get("1.0", "end-1c").strip(),
        }

        # État de chargement explicite : bouton désactivé + libellé d'attente.
        self._button.configure(state="disabled", text="Analyse du profil…")
        self._status.configure(text="Interrogation de l'IA pour tes plages cibles…")

        # L'appel API peut prendre plusieurs secondes : JAMAIS dans le thread
        # de l'interface, sinon la fenêtre gèle.
        threading.Thread(target=self._fetch_ranges, args=(profile,),
                         daemon=True).start()

    def _fetch_ranges(self, profile: dict):
        """Thread secondaire : seul l'appel API vit ici."""
        ranges = get_target_ranges(
            bike_type=profile["bike_type"],
            position=profile["position"],
            comment=profile["comment"],
        )
        # Règle d'or tkinter : pas de widgets depuis un autre thread.
        self.after(0, lambda: self._ranges_ready(profile, ranges))

    def _ranges_ready(self, profile: dict, ranges: dict):
        self._button.configure(state="normal",
                               text="Calculer mes plages d'angles")
        self._status.configure(text="")
        self._on_profile_ready(profile, ranges)
