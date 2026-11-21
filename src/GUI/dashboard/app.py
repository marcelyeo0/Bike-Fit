"""
app.py — Fenêtre principale du logiciel de bureau : le dashboard Axio.

Reproduit la coque du dashboard web (BarreLaterale.tsx + layout) :

  ┌────────────┬───────────────────────────────────────┐
  │ AXIO       │  page courante (défilante)            │
  │ ▌Tableau   │                                       │
  │  Études    │                                       │
  │  Clients   │                                       │
  │  Paramètres│                                       │
  │ ┌────────┐ │                                       │
  │ │Formule │ │                                       │
  └────────────┴───────────────────────────────────────┘

Navigation : `aller(nom, **parametres)` détruit la page et reconstruit la
suivante à partir de la base (comme une requête serveur côté web). Les
données vivent dans SQLite (src/data/store.py), rien ne sort de la machine.
"""

import customtkinter as ctk

from src.core.angles import AngleRange
from src.data.store import Store
from src.GUI import theme as t
from src.GUI.anim import fade_in
from src.GUI.dashboard import composants as c
from src.GUI.dashboard import pages

LARGEUR_BARRE = 264
MARGE_PAGE = 48
LARGEUR_PAGE_MAX = 1240

LIENS = [("accueil", "Tableau de bord"), ("etudes", "Études"),
         ("clients", "Clients"), ("parametres", "Paramètres")]

# Section de la barre latérale allumée pour chaque page.
SECTION = {"accueil": "accueil", "etudes": "etudes", "etude": "etudes",
           "nouvelle": "etudes", "clients": "clients", "client": "clients",
           "parametres": "parametres"}


class DashboardApp(ctk.CTk):

    def __init__(self, model_path: str, store: Store = None):
        super().__init__(fg_color=t.BLANC)
        t.init_fonts(self)
        self.store = store or Store()
        self.model_path = model_path
        self._page = None
        self._liens = {}

        self.title("Axio — Tableau de bord")
        self.geometry("1360x860")
        self.minsize(1080, 680)
        try:
            self.state("zoomed")          # plein écran fenêtré sous Windows
        except Exception:
            pass

        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self._construire_barre()
        ctk.CTkFrame(self, fg_color=t.LIGNE, width=1, corner_radius=0).grid(
            row=0, column=0, sticky="nse")

        self._defilant = ctk.CTkScrollableFrame(
            self, fg_color=t.BLANC, corner_radius=0,
            scrollbar_button_color=t.LIGNE, scrollbar_button_hover_color=t.GRIS_CLAIR)
        self._defilant.grid(row=0, column=1, sticky="nsew")
        self._defilant.grid_columnconfigure(0, weight=1)

        self.aller("accueil")
        fade_in(self, 200)

    # ------------------------------------------------------------------ #
    # Barre latérale
    # ------------------------------------------------------------------ #
    def _construire_barre(self):
        barre = ctk.CTkFrame(self, fg_color=t.BLANC, corner_radius=0, width=LARGEUR_BARRE)
        barre.grid(row=0, column=0, sticky="ns")
        barre.grid_propagate(False)
        barre.pack_propagate(False)

        marque = c.label(barre, "AXIO", 24, "bold", t.ENCRE, "titre", cursor="hand2")
        marque.pack(anchor="w", padx=24, pady=(22, 18))
        marque.bind("<Button-1>", lambda e: self.aller("accueil"))

        nav = ctk.CTkFrame(barre, fg_color="transparent")
        nav.pack(fill="x", padx=12)
        for cle, libelle in LIENS:
            self._liens[cle] = self._lien_nav(nav, cle, libelle)

        pied = ctk.CTkFrame(barre, fg_color="transparent")
        pied.pack(side="bottom", fill="x")
        c.filet(pied).pack(fill="x")
        formule = ctk.CTkFrame(pied, fg_color=t.FOND_DOUX, corner_radius=14)
        formule.pack(fill="x", padx=16, pady=16)
        c.label(formule, "FORMULE", 11, couleur=t.GRIS, role="mono").pack(
            anchor="w", padx=16, pady=(12, 0))
        c.label(formule, "Accès illimité", 14.5, "bold", t.ENCRE).pack(anchor="w", padx=16)
        c.label(formule, "Version bureau · données locales", 12.5, couleur=t.GRIS).pack(
            anchor="w", padx=16, pady=(2, 12))

    def _lien_nav(self, parent, cle, libelle):
        ligne = ctk.CTkFrame(parent, fg_color="transparent", corner_radius=10, height=42)
        ligne.pack(fill="x", pady=2)
        ligne.pack_propagate(False)
        liseré = ctk.CTkFrame(ligne, fg_color=t.ROUGE, width=3, height=18, corner_radius=2)
        icone = ctk.CTkLabel(ligne, text=c.icone(cle), width=22,
                             font=(c.police_icones() or t.FAMILY, 16), text_color=t.TEXTE_DOUX)
        icone.pack(side="left", padx=(14, 10))
        texte = c.label(ligne, libelle, 14.5, "bold", t.TEXTE_DOUX)
        texte.pack(side="left")
        ligne._parts = (liseré, icone, texte)

        def clic(_):
            self.aller(cle)

        def survol(actif):
            if SECTION.get(self._page) != cle:
                ligne.configure(fg_color=t.FOND_DOUX if actif else "transparent")
                for w in (icone, texte):
                    w.configure(text_color=t.ENCRE if actif else t.TEXTE_DOUX)

        for w in (ligne, icone, texte):
            w.bind("<Button-1>", clic)
            w.bind("<Enter>", lambda e: survol(True))
            w.bind("<Leave>", lambda e: survol(False))
            w.configure(cursor="hand2")
        return ligne

    def _allumer(self, section):
        for cle, ligne in self._liens.items():
            liseré, icone, texte = ligne._parts
            actif = cle == section
            ligne.configure(fg_color=t.FOND_DOUX if actif else "transparent")
            for w in (icone, texte):
                w.configure(text_color=t.ENCRE if actif else t.TEXTE_DOUX)
            if actif:
                liseré.place(x=0, rely=0.5, anchor="w")
            else:
                liseré.place_forget()

    # ------------------------------------------------------------------ #
    # Navigation
    # ------------------------------------------------------------------ #
    def aller(self, nom, **parametres):
        for w in self._defilant.winfo_children():
            w.destroy()
        self._page = nom
        self._allumer(SECTION[nom])

        conteneur = ctk.CTkFrame(self._defilant, fg_color="transparent")
        conteneur.grid(row=0, column=0, sticky="new", padx=MARGE_PAGE, pady=(40, 64))
        conteneur.grid_columnconfigure(0, weight=1)

        constructeur = getattr(pages, f"page_{nom}")
        constructeur(self, conteneur, **parametres)

        self.update_idletasks()
        self._defilant._parent_canvas.yview_moveto(0)

    def largeur_contenu(self) -> int:
        """Largeur utile de la page, pour choisir 2 ou 3 colonnes."""
        largeur = self._defilant.winfo_width() or (self.winfo_width() - LARGEUR_BARRE)
        return min(LARGEUR_PAGE_MAX, max(600, largeur - 2 * MARGE_PAGE - 20))

    def colonnes(self) -> int:
        return 3 if self.largeur_contenu() >= 960 else 2

    # ------------------------------------------------------------------ #
    # Séance de capture
    # ------------------------------------------------------------------ #
    def demarrer_seance(self, etude_id, sur_etat):
        """Fige les fourchettes (règles fixes, instantané) puis ouvre la
        fenêtre de capture webcam."""
        sur_etat("Ouverture de la caméra…")
        contexte = self.store.ouvrir_seance(etude_id)
        if contexte is None:
            sur_etat("Cette étude n’est plus un brouillon : la séance ne peut pas s’ouvrir.")
            return
        self._ouvrir_capture(contexte, contexte["plages_seance"])

    def _ouvrir_capture(self, contexte, ps):
        from src.GUI.analysis_window import AnalysisWindow

        etude_id = contexte["etude_id"]
        plages = {j: AngleRange(*p) for j, p in ps["plages"].items()}
        source = ("Fourchettes Axio, ajustées à la morphologie." if ps["morphologie"]
                  else "Fourchettes Axio, sans mensurations.")

        def terminee(valeurs):
            enregistree = self.store.enregistrer_seance(etude_id, valeurs)
            self.deiconify()
            self.aller("etude", etude_id=etude_id,
                       info=("Séance enregistrée : l’étude est terminée." if enregistree
                             else "Aucun angle n’a pu être mesuré : l’étude reste en brouillon."))

        def annulee():
            self.deiconify()
            self.aller("etude", etude_id=etude_id)

        self.withdraw()
        AnalysisWindow(self, ranges=plages, advice=ps["conseils"], comment="",
                       model_path=self.model_path, on_finished=terminee,
                       on_close=annulee, note=source,
                       title=f"Axio — Séance · {contexte['sujet']}")
