"""
composants.py — Briques visuelles du dashboard, calquées sur celles du web
(src/app/(dashboard)/_composants/classes.ts) : un seul accent rouge, pas de
vert ni d'orange, statut lu au contraste (encre = abouti, rouge = problème,
gris = en attente).
"""

import tkinter.font as tkfont

import customtkinter as ctk

from src.GUI import theme as t

# --------------------------------------------------------------------------- #
# Libellés (src/lib/libelles.ts)
# --------------------------------------------------------------------------- #

LIBELLES_STATUT = {"DRAFT": "Brouillon", "PROCESSING": "Analyse en cours",
                   "COMPLETED": "Terminée", "FAILED": "Échec"}
LIBELLES_JOINT = {"knee": "Genou", "hip": "Hanche", "elbow": "Coude",
                  "shoulder": "Épaule", "ankle": "Cheville"}
LIBELLES_MESURE = {"OK": "Dans la fourchette", "WARNING": "Proche de la limite",
                   "OUT": "Hors fourchette"}
LIBELLES_PRATIQUE = {"ROUTE": "Route", "GRAVEL": "Gravel", "CHRONO": "Chrono / triathlon"}
LIBELLES_OBJECTIF = {"CONFORT": "Confort", "MIXTE": "Mixte", "AERO": "Aéro"}

PASTILLES = {"DRAFT": t.GRIS_CLAIR, "PROCESSING": t.GRIS,
             "COMPLETED": t.ENCRE, "FAILED": t.ROUGE}

_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
         "août", "septembre", "octobre", "novembre", "décembre"]

MENTION = "Outil d’aide au réglage, ne constitue pas un avis médical."


def formater_date(d) -> str:
    return f"{d.day} {_MOIS[d.month - 1]} {d.year}" if d else "—"


def _nombre(v: float) -> str:
    texte = f"{v:.1f}".rstrip("0").rstrip(".")
    return texte.replace(".", ",")


def formater_cm(v) -> str:
    return "—" if v is None else f"{_nombre(v)} cm"


def formater_degres(v) -> str:
    return f"{_nombre(v)}°"


def formater_cadre(pratique, objectif):
    morceaux = [m for m in (LIBELLES_PRATIQUE.get(pratique), LIBELLES_OBJECTIF.get(objectif)) if m]
    return " · ".join(morceaux) or None


# --------------------------------------------------------------------------- #
# Icônes : Segoe Fluent Icons (Windows 11), sinon rien plutôt qu'un carré vide
# --------------------------------------------------------------------------- #

ICONES = {"accueil": "", "etudes": "", "clients": "",
          "parametres": "", "camera": "", "imprimer": "",
          "telecharger": "", "retour": "", "ajouter": "",
          "dossier": "", "cadeau": ""}
_POLICE_ICONES = None


def icone(nom: str) -> str:
    return ICONES[nom] if police_icones() else ""


def police_icones():
    global _POLICE_ICONES
    if _POLICE_ICONES is None:
        familles = set(tkfont.families())
        _POLICE_ICONES = next((f for f in ("Segoe Fluent Icons", "Segoe MDL2 Assets")
                               if f in familles), "")
    return _POLICE_ICONES


# --------------------------------------------------------------------------- #
# Texte
# --------------------------------------------------------------------------- #

def label(parent, texte, taille=14, graisse="normal", couleur=t.TEXTE, role="texte",
          wrap=0, **kw):
    """wrap="auto" : retour à la ligne sur la largeur du parent (qui doit
    lui-même être étiré, sinon la largeur suit le texte)."""
    lab = ctk.CTkLabel(parent, text=texte, font=t.font(taille, graisse, role),
                       text_color=couleur, anchor="w", justify="left",
                       wraplength=0 if wrap == "auto" else wrap, **kw)
    if wrap == "auto":
        def ajuster(e):
            echelle = lab._get_widget_scaling()
            largeur = max(60, int(e.width / echelle) - 4)
            if lab.cget("wraplength") != largeur:
                lab.configure(wraplength=largeur)
        parent.bind("<Configure>", ajuster, add="+")
    return lab


def surtitre(parent, texte):
    return label(parent, texte.upper(), 12, couleur=t.GRIS, role="mono")


def titre_page(parent, titre, sous_titre=None, wrap=640):
    bloc = ctk.CTkFrame(parent, fg_color="transparent")
    label(bloc, titre, 40, "bold", t.ENCRE, "titre").pack(anchor="w")
    if sous_titre:
        label(bloc, sous_titre, 15.5, couleur=t.TEXTE_DOUX, wrap=wrap).pack(anchor="w", pady=(8, 0))
    return bloc


def message(parent, texte, erreur=False):
    return label(parent, texte, 13.5, "bold" if erreur else "normal",
                 t.ROUGE_TEXTE if erreur else t.TEXTE_DOUX)


def lien(parent, texte, commande, accent=False, taille=13.5, avec_icone=None):
    """Lien discret souligné (gris → encre au survol), ou lien d'accent rouge."""
    base = t.ROUGE_TEXTE if accent else t.GRIS
    survol = t.ROUGE_CTA_HOVER if accent else t.ENCRE
    police = ctk.CTkFont(family=t.FAMILY, size=round(taille),
                         weight="bold" if accent else "normal", underline=True)
    lab = ctk.CTkLabel(parent, text=texte, font=police, text_color=base,
                       anchor="w", cursor="hand2")
    if avec_icone and police_icones():
        lab.configure(text=f"{ICONES[avec_icone]}  {texte}")
    lab.bind("<Button-1>", lambda e: commande())
    lab.bind("<Enter>", lambda e: lab.configure(text_color=survol))
    lab.bind("<Leave>", lambda e: lab.configure(text_color=base))
    return lab


# --------------------------------------------------------------------------- #
# Surfaces
# --------------------------------------------------------------------------- #

def bloc(parent, **kw):
    """`rounded-bloc border border-ligne bg-white`."""
    return ctk.CTkFrame(parent, fg_color=t.BLANC, border_color=t.LIGNE, border_width=1,
                        corner_radius=t.RAYON_BLOC, **kw)


def filet(parent, couleur=t.LIGNE_DOUCE):
    return ctk.CTkFrame(parent, fg_color=couleur, height=1, corner_radius=0)


def pastille(parent, couleur, taille=8):
    return ctk.CTkFrame(parent, fg_color=couleur, width=taille, height=taille,
                        corner_radius=taille // 2)


def badge_demo(parent):
    return ctk.CTkLabel(parent, text="DÉMO", font=t.font(11, "bold", "mono"),
                        fg_color=t.ROUGE_CTA, text_color=t.BLANC, corner_radius=12,
                        height=24, padx=10)


def puce(parent, texte, bordure, couleur):
    """Pastille de mesure en contour (`rounded-full border px-3 py-1`)."""
    cadre = ctk.CTkFrame(parent, fg_color=t.BLANC, border_color=bordure, border_width=1,
                         corner_radius=14, height=28)
    ctk.CTkLabel(cadre, text=texte, font=t.font(12.5, "bold"), text_color=couleur,
                 height=20).pack(padx=12, pady=3)
    return cadre


# --------------------------------------------------------------------------- #
# Boutons
# --------------------------------------------------------------------------- #

def _avec_icone(texte, nom):
    return f"{ICONES[nom]}   {texte}" if nom and police_icones() else texte


def bouton_primaire(parent, texte, commande, icone_nom=None, **kw):
    """Action principale d'une page. Une seule par écran."""
    return ctk.CTkButton(parent, text=_avec_icone(texte, icone_nom), command=commande,
                         height=50, corner_radius=25, fg_color=t.ROUGE_CTA,
                         hover_color=t.ROUGE_CTA_HOVER, text_color=t.BLANC,
                         font=t.font(15.5, "bold"), **kw)


def bouton_contour(parent, texte, commande, icone_nom=None, **kw):
    return ctk.CTkButton(parent, text=_avec_icone(texte, icone_nom), command=commande,
                         height=42, corner_radius=21, fg_color=t.BLANC,
                         hover_color=t.FOND_DOUX, border_color=t.ENCRE, border_width=1,
                         text_color=t.ENCRE, font=t.font(14, "bold"), **kw)


def bouton_danger(parent, texte, commande, plein=False, **kw):
    """Contour rouge ; aplat seulement pour la confirmation."""
    if plein:
        return ctk.CTkButton(parent, text=texte, command=commande, height=42,
                             corner_radius=21, fg_color=t.ROUGE_CTA,
                             hover_color=t.ROUGE_CTA_HOVER, text_color=t.BLANC,
                             font=t.font(14, "bold"), **kw)
    return ctk.CTkButton(parent, text=texte, command=commande, height=42, corner_radius=21,
                         fg_color=t.BLANC, hover_color="#FDECEA", border_color=t.ROUGE,
                         border_width=1, text_color=t.ROUGE_TEXTE,
                         font=t.font(14, "bold"), **kw)


class Pilules(ctk.CTkFrame):
    """Choix exclusif en pilules (`peer-checked:bg-encre`)."""

    def __init__(self, parent, choix, valeur=None, commande=None, hauteur=42):
        super().__init__(parent, fg_color="transparent")
        self.valeur = valeur
        self._commande = commande
        self._boutons = {}
        for cle, libelle in choix:
            b = ctk.CTkButton(self, text=libelle, height=hauteur, corner_radius=hauteur // 2, width=96,
                              border_width=1, font=t.font(14, "bold"),
                              command=lambda c=cle: self.choisir(c))
            b.pack(side="left", padx=(0, 8))
            self._boutons[cle] = b
        self._peindre()

    def choisir(self, cle):
        self.valeur = cle
        self._peindre()
        if self._commande:
            self._commande(cle)

    def _peindre(self):
        for cle, b in self._boutons.items():
            if cle == self.valeur:
                b.configure(fg_color=t.ENCRE, hover_color=t.ENCRE, border_color=t.ENCRE,
                            text_color=t.BLANC)
            else:
                b.configure(fg_color=t.BLANC, hover_color=t.FOND_DOUX, border_color=t.LIGNE,
                            text_color=t.TEXTE_DOUX)


class Suppression(ctk.CTkFrame):
    """Bouton de suppression en deux temps (BoutonSuppression.tsx)."""

    def __init__(self, parent, libelle, avertissement, action):
        super().__init__(parent, fg_color="transparent")
        self._libelle, self._avertissement, self._action = libelle, avertissement, action
        self._replie()

    def _vider(self):
        for w in self.winfo_children():
            w.destroy()

    def _replie(self):
        self._vider()
        bouton_danger(self, self._libelle, self._deplie).pack(anchor="w")

    def _deplie(self):
        self._vider()
        label(self, self._avertissement + " Cette action est définitive.", 14, "bold",
              t.ENCRE, wrap=640).pack(anchor="w")
        ligne = ctk.CTkFrame(self, fg_color="transparent")
        ligne.pack(anchor="w", pady=(14, 0))
        bouton_danger(ligne, "Confirmer la suppression", self._action, plein=True).pack(side="left")
        bouton_contour(ligne, "Annuler", self._replie).pack(side="left", padx=(12, 0))


# --------------------------------------------------------------------------- #
# Champs
# --------------------------------------------------------------------------- #

def champ(parent, valeur="", placeholder="", largeur=None):
    e = ctk.CTkEntry(parent, height=50, corner_radius=12, border_width=1,
                     border_color=t.LIGNE, fg_color=t.BLANC, text_color=t.ENCRE,
                     placeholder_text=placeholder, placeholder_text_color=t.GRIS_CLAIR,
                     font=t.font(15), **({"width": largeur} if largeur else {}))
    if valeur:
        e.insert(0, valeur)
    return e


def etiquette(parent, texte, precision=None):
    cadre = ctk.CTkFrame(parent, fg_color="transparent")
    label(cadre, texte, 14, "bold", t.ENCRE).pack(side="left")
    if precision:
        label(cadre, f" {precision}", 14, couleur=t.GRIS).pack(side="left")
    return cadre


class ChampsClient(ctk.CTkFrame):
    """Nom + taille + entrejambe (ChampsClient.tsx)."""

    def __init__(self, parent, nom="", taille=None, entrejambe=None):
        super().__init__(parent, fg_color="transparent")
        self.grid_columnconfigure((0, 1), weight=1, uniform="c")
        etiquette(self, "Nom du cycliste").grid(row=0, column=0, columnspan=2, sticky="w")
        self.nom = champ(self, nom, "Prénom Nom")
        self.nom.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(8, 18))
        etiquette(self, "Taille", "(cm, facultatif)").grid(row=2, column=0, sticky="w")
        etiquette(self, "Entrejambe", "(cm, facultatif)").grid(row=2, column=1, sticky="w",
                                                                 padx=(18, 0))
        self.taille = champ(self, _nombre(taille) if taille else "", "178")
        self.taille.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        self.entrejambe = champ(self, _nombre(entrejambe) if entrejambe else "", "84")
        self.entrejambe.grid(row=3, column=1, sticky="ew", pady=(8, 0), padx=(18, 0))

    def lire(self, store_module):
        """(erreur, nom, taille, entrejambe) ; erreur = 'nom' | 'mensurations' | None."""
        nom = store_module.lire_nom(self.nom.get())
        if nom is None:
            return "nom", None, None, None
        ok_t, taille = store_module.lire_mensuration(self.taille.get(), store_module.BORNES_TAILLE)
        ok_e, ej = store_module.lire_mensuration(self.entrejambe.get(),
                                                 store_module.BORNES_ENTREJAMBE)
        if not (ok_t and ok_e):
            return "mensurations", None, None, None
        return None, nom, taille, ej


ERREURS_CLIENT = {
    "nom": "Saisissez le nom du cycliste, 80 caractères au plus.",
    "mensurations": "Mensurations hors limites. Saisissez des centimètres, par exemple 178 et 84,5.",
}


# --------------------------------------------------------------------------- #
# Cartes
# --------------------------------------------------------------------------- #

def _cliquable(cadre, commande):
    """Toute la carte est un lien ; bordure encre au survol."""
    def entrer(_):
        cadre.configure(border_color=t.ENCRE)

    def sortir(_):
        x, y = cadre.winfo_pointerxy()
        survole = cadre.winfo_containing(x, y)
        while survole is not None:
            if survole is cadre:
                return
            survole = getattr(survole, "master", None)
        cadre.configure(border_color=t.LIGNE)

    def lier(w):
        w.bind("<Button-1>", lambda e: commande(), add="+")
        w.bind("<Enter>", entrer, add="+")
        w.bind("<Leave>", sortir, add="+")
        try:
            w.configure(cursor="hand2")
        except Exception:
            pass
        for enfant in w.winfo_children():
            lier(enfant)
    lier(cadre)


_PUCE_MESURE = {"OK": (t.LIGNE, t.TEXTE_DOUX), "WARNING": (t.GRIS, t.ENCRE),
                "OUT": (t.ROUGE, t.ROUGE_TEXTE)}


def carte_etude(parent, etude, ouvrir, largeur=320):
    carte = bloc(parent)
    interieur = ctk.CTkFrame(carte, fg_color="transparent")
    interieur.pack(fill="both", expand=True, padx=24, pady=22)

    haut = ctk.CTkFrame(interieur, fg_color="transparent")
    haut.pack(fill="x")
    gauche = ctk.CTkFrame(haut, fg_color="transparent")
    gauche.pack(side="left", fill="x", expand=True)
    label(gauche, etude["sujet"], 17, "bold", t.ENCRE, wrap=largeur - 110).pack(anchor="w")
    cadre = formater_cadre(etude["pratique"], etude["objectif"])
    date = formater_date(etude["completed_at"] or etude["created_at"])
    label(gauche, date + (f" · {cadre}" if cadre else ""), 13, couleur=t.GRIS,
          wrap=largeur - 80).pack(anchor="w", pady=(2, 0))
    if etude["is_demo"]:
        badge_demo(haut).pack(side="right", anchor="n")

    statut = ctk.CTkFrame(interieur, fg_color="transparent")
    statut.pack(fill="x", pady=(14, 0))
    pastille(statut, PASTILLES[etude["status"]]).pack(side="left")
    label(statut, LIBELLES_STATUT[etude["status"]], 13, "bold", t.TEXTE).pack(side="left", padx=(8, 0))

    rang = {"OUT": 0, "WARNING": 1, "OK": 2}
    mesures = sorted(etude.get("mesures", []), key=lambda m: rang[m["status"]])[:4]
    if mesures:
        puces = ctk.CTkFrame(interieur, fg_color="transparent")
        puces.pack(fill="x", pady=(16, 0))
        for i, m in enumerate(mesures):
            bordure, couleur = _PUCE_MESURE[m["status"]]
            puce(puces, f"{LIBELLES_JOINT[m['joint']]} {round(m['value'])}°", bordure,
                 couleur).grid(row=i // 2, column=i % 2, sticky="w", padx=(0, 8), pady=(0, 8))
    _cliquable(carte, ouvrir)
    return carte


def carte_stat(parent, libelle, valeur, precision, accent=False):
    carte = bloc(parent)
    interieur = ctk.CTkFrame(carte, fg_color="transparent")
    interieur.pack(fill="both", expand=True, padx=24, pady=22)
    label(interieur, libelle.upper(), 11, couleur=t.GRIS, role="mono").pack(anchor="w")
    label(interieur, str(valeur), 38, "bold", t.ROUGE if accent else t.ENCRE,
          "titre").pack(anchor="w", pady=(10, 4))
    label(interieur, precision, 13, couleur=t.TEXTE_DOUX, wrap="auto").pack(fill="x")
    return carte


def grille(parent, elements, colonnes=3, ecart=16):
    """Grille de cartes à colonnes égales. `elements` : fabriques f(parent)."""
    cadre = ctk.CTkFrame(parent, fg_color="transparent")
    for c in range(colonnes):
        cadre.grid_columnconfigure(c, weight=1, uniform="grille")
    for i, fabrique in enumerate(elements):
        w = fabrique(cadre)
        w.grid(row=i // colonnes, column=i % colonnes, sticky="nsew",
               padx=(0 if i % colonnes == 0 else ecart / 2,
                     0 if i % colonnes == colonnes - 1 else ecart / 2),
               pady=(0, ecart))
    return cadre


class Tableau(ctk.CTkFrame):
    """Tableau dans un bloc : en-tête mono, lignes séparées par des filets."""

    def __init__(self, parent, colonnes, poids=None):
        super().__init__(parent, fg_color=t.BLANC, border_color=t.LIGNE, border_width=1,
                         corner_radius=t.RAYON_BLOC)
        self._n = len(colonnes)
        self._ligne = 0
        poids = poids or [1] * self._n
        self._corps = ctk.CTkFrame(self, fg_color="transparent")
        self._corps.pack(fill="both", expand=True, padx=8, pady=6)
        for c, p in enumerate(poids):
            self._corps.grid_columnconfigure(c, weight=p, uniform="tab")
        for c, titre in enumerate(colonnes):
            label(self._corps, titre.upper(), 11, "bold", t.GRIS, "mono").grid(
                row=0, column=c, sticky="w", padx=16, pady=(12, 12))
        self._ligne = 1

    def ajouter(self, cellules):
        """cellules : fabriques f(parent) ou textes."""
        filet(self._corps, t.LIGNE if self._ligne == 1 else t.LIGNE_DOUCE).grid(
            row=self._ligne, column=0, columnspan=self._n, sticky="ew")
        self._ligne += 1
        for c, cellule in enumerate(cellules):
            w = cellule(self._corps) if callable(cellule) else label(self._corps, cellule, 14.5)
            w.grid(row=self._ligne, column=c, sticky="w", padx=16, pady=13)
        self._ligne += 1
