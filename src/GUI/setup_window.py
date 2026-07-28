"""
setup_window.py — Questionnaire de départ, layout split-screen asymétrique.

  ┌───────────────┬──────────────────────────┐
  │  panneau      │  VÉLO        │ POSITION  │
  │  sombre       │  SOUPLESSE   │ NIVEAU    │
  │  BikeFit      │  VOLUME      │ ÂGE       │
  │  (marque,     │  REMARQUES     [textbox] │
  │   ancré bas)  │  [Calculer mes plages]   │
  └───────────────┴──────────────────────────┘

Six questions en grille 2 colonnes : chacune aiguille l'IA sur le choix
des plages d'angles (souplesse → ouverture de hanche, niveau/volume →
tolérance à l'agressivité, âge → biais confort).

Le panneau de marque est ancré en BAS à gauche (asymétrie assumée : la
zone haute reste vide, ça respire). Le formulaire suit la règle
« label au-dessus du champ » avec un état de chargement explicite sur
le bouton pendant l'appel API.

À la validation : appel API (ranges.get_target_ranges) dans un THREAD,
puis callback on_profile_ready(profile, ranges) vers main.py.
"""

import threading
import tkinter as tk

import customtkinter as ctk

from src.core.ranges import get_target_ranges
from src.GUI import theme
from src.GUI.anim import fade_in, smooth_hover


class SetupWindow(ctk.CTk):
    """Fenêtre principale : questionnaire avant l'analyse."""

    def __init__(self, on_profile_ready):
        super().__init__(fg_color=theme.BG)
        # Résout les piles de polices sur ce qui est réellement installé
        # (SF Pro → Segoe UI Variable → Segoe UI). Première fenêtre = bon
        # moment : tout widget construit ensuite hérite du résultat.
        theme.init_fonts(self)
        self._on_profile_ready = on_profile_ready

        self.title("BikeFit")
        self.geometry("960x680")
        self.resizable(False, False)

        self._build_ui()
        # Entrée = valider (attente desktop standard), sauf dans la zone de
        # remarques où Entrée doit rester un retour à la ligne.
        self.bind("<Return>", self._on_return)
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
                     text="Quelques réponses pour que l'IA calcule des plages "
                          "d'angles adaptées à TON corps et TA pratique.",
                     font=theme.FONT_SMALL, text_color=theme.TEXT_2,
                     anchor="w").pack(fill="x", pady=(2, 12))

        # Grille 2 colonnes : 6 questions empilées feraient une fenêtre
        # interminable. Chaque question aiguille l'IA sur les angles :
        #   vélo/position → base des plages ;
        #   souplesse     → ouverture de hanche atteignable ;
        #   niveau/volume → tolérance à une position agressive ;
        #   âge           → biais confort.
        grid = ctk.CTkFrame(form, fg_color="transparent")
        grid.pack(fill="x")
        grid.grid_columnconfigure(0, weight=1, uniform="fields")
        grid.grid_columnconfigure(1, weight=1, uniform="fields")

        self._bike = self._segmented_field(
            grid, 0, 0, "TON VÉLO", ["Route", "Gravel", "VTT", "Ville"], "Route")
        self._position = self._segmented_field(
            grid, 0, 1, "POSITION RECHERCHÉE", ["Confort", "Mixte", "Aéro"], "Mixte")
        self._flexibility = self._segmented_field(
            grid, 1, 0, "SOUPLESSE (TOUCHER SES PIEDS)",
            ["Faible", "Moyenne", "Bonne"], "Moyenne")
        self._level = self._segmented_field(
            grid, 1, 1, "NIVEAU DE PRATIQUE",
            ["Débutant", "Intermédiaire", "Confirmé"], "Intermédiaire")
        self._volume = self._segmented_field(
            grid, 2, 0, "VOLUME HEBDOMADAIRE",
            ["< 3 h", "3-6 h", "> 6 h"], "3-6 h")
        self._age = self._segmented_field(
            grid, 2, 1, "TRANCHE D'ÂGE",
            ["< 30 ans", "30-50 ans", "> 50 ans"], "30-50 ans")

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
            font=theme.FONT_BUTTON,
            corner_radius=theme.BTN_RADIUS, height=theme.BTN_HEIGHT,
            fg_color=theme.BTN_DARK, hover_color=theme.BTN_DARK_HOVER,
            command=self._submit)
        self._button.pack(fill="x", pady=(22, 6))
        smooth_hover(self._button, theme.BTN_DARK, theme.BTN_DARK_HOVER)

        self._status = ctk.CTkLabel(form, text="", font=theme.FONT_SMALL,
                                    text_color=theme.TEXT_2, anchor="w")
        self._status.pack(fill="x")

    def _segmented_field(self, grid, row: int, col: int,
                         label: str, values: list, default: str):
        """Un champ « label au-dessus + choix segmenté » dans une cellule
        de la grille 2 colonnes. Renvoie le widget segmenté."""
        cell = ctk.CTkFrame(grid, fg_color="transparent")
        cell.grid(row=row, column=col, sticky="ew",
                  padx=(0, 12) if col == 0 else (12, 0), pady=(10, 0))
        ctk.CTkLabel(cell, text=label, font=theme.FONT_SECTION,
                     text_color=theme.TEXT_2, anchor="w"
                     ).pack(fill="x", pady=(0, 4))
        # Style « segmented control » iOS : piste grise, segment sélectionné
        # BLANC en pilule — le texte sombre reste lisible sur tous les états
        # (CTkSegmentedButton n'a qu'une seule couleur de texte : une
        # sélection sombre le rendrait illisible).
        seg = ctk.CTkSegmentedButton(
            cell, values=values, font=theme.FONT_BODY,
            corner_radius=18, height=36,
            selected_color=theme.CARD, selected_hover_color=theme.CARD,
            unselected_color=theme.SEPARATOR,
            unselected_hover_color="#EBEBEF",
            fg_color=theme.SEPARATOR, text_color=theme.TEXT)
        seg.set(default)
        seg.pack(fill="x")
        return seg

    # ------------------------------------------------------------------ #
    # Validation : appel API dans un thread
    # ------------------------------------------------------------------ #
    def _on_return(self, event):
        if isinstance(event.widget, tk.Text):
            return                      # zone Remarques : retour à la ligne
        self._submit()

    def _submit(self):
        if self._button.cget("state") == "disabled":
            return                      # appel API déjà en cours
        profile = {
            "bike_type": self._bike.get().lower(),
            "position": self._position.get().lower(),
            "flexibility": self._flexibility.get().lower(),
            "level": self._level.get().lower(),
            "volume": self._volume.get(),
            "age": self._age.get(),
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
        ranges, advice = get_target_ranges(profile)
        # Règle d'or tkinter : pas de widgets depuis un autre thread.
        self.after(0, lambda: self._ranges_ready(profile, ranges, advice))

    def _ranges_ready(self, profile: dict, ranges: dict, advice: dict):
        self._button.configure(state="normal",
                               text="Calculer mes plages d'angles")
        self._status.configure(text="")
        self._on_profile_ready(profile, ranges, advice)
