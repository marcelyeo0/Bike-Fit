"""
pages.py — Les écrans du dashboard, un constructeur par page web :

  page_accueil     /dashboard
  page_etudes      /dashboard/etudes
  page_etude       /dashboard/etudes/[id]
  page_nouvelle    /dashboard/etudes/nouvelle
  page_clients     /dashboard/clients
  page_client      /dashboard/clients/[id]
  page_parametres  /dashboard/parametres

Chaque constructeur reçoit l'application (store, navigation) et le cadre de
la page, et relit la base : pas d'état d'écran à synchroniser.
"""

import os
import re
from tkinter import filedialog

import customtkinter as ctk

from src.core import biomeca
from src.data import store as store_module
from src.GUI import theme as t
from src.GUI.dashboard import composants as c
from src.GUI.dashboard import rapport

_TON_MESURE = {"OK": ("normal", t.TEXTE_DOUX), "WARNING": ("bold", t.ENCRE),
               "OUT": ("bold", t.ROUGE_TEXTE)}


def _entete(parent, titre, sous_titre, droite=None):
    entete = ctk.CTkFrame(parent, fg_color="transparent")
    entete.grid(sticky="ew")
    c.titre_page(entete, titre, sous_titre).pack(side="left", anchor="n")
    if droite:
        droite(entete).pack(side="right", anchor="n")
    return entete


def _info(parent, texte, erreur=False, pady=(24, 0)):
    if texte:
        c.message(parent, texte, erreur).grid(sticky="w", pady=pady)


def _section(parent, titre, pady=(48, 0)):
    c.surtitre(parent, titre).grid(sticky="w", pady=pady)


def _cartes(app, parent, etudes, extra=None):
    fabriques = [lambda p, e=e: c.carte_etude(p, e, lambda e=e: app.aller("etude", etude_id=e["id"]),
                                                app.largeur_contenu() // app.colonnes())
                 for e in etudes]
    if extra:
        fabriques.append(extra)
    c.grille(parent, fabriques, app.colonnes()).grid(sticky="ew", pady=(16, 0))


def _nom_fichier(texte):
    return re.sub(r"[^\w\-]+", "-", texte, flags=re.UNICODE).strip("-").lower() or "export"


# --------------------------------------------------------------------------- #
# Tableau de bord
# --------------------------------------------------------------------------- #

def page_accueil(app, p):
    stats = app.store.statistiques()
    etudes = app.store.etudes_recentes()
    vide = not etudes
    atelier = app.store.atelier()["nom"]

    _entete(p, "Tableau de bord",
            (f"Bonjour {atelier}. " if atelier else "")
            + "Vos études de position, vos clients et les écarts relevés.",
            lambda e: c.bouton_primaire(e, "Nouvelle étude", lambda: app.aller("nouvelle")))

    tuiles = [("Études réalisées", stats["etudes_realisees"],
               "Analyses terminées depuis la création de l’atelier", False),
              ("Clients suivis", stats["clients_suivis"],
               "Fiches clients enregistrées dans votre atelier", False),
              ("Études ce mois-ci", stats["etudes_ce_mois"],
               "Séances ouvertes depuis le 1er du mois", False),
              ("Écarts détectés", stats["ecarts_detectes"],
               "Angles hors de la fourchette cible, toutes études confondues", True)]
    colonnes = 4 if app.largeur_contenu() >= 1000 else 2
    c.grille(p, [lambda q, x=x: c.carte_stat(q, *x) for x in tuiles], colonnes).grid(
        sticky="ew", pady=(40, 0))

    ligne = ctk.CTkFrame(p, fg_color="transparent")
    ligne.grid(sticky="ew", pady=(32, 0))
    c.surtitre(ligne, "Exemple de rapport" if vide else "Études récentes").pack(side="left")
    if not vide:
        c.lien(ligne, "Toutes les études", lambda: app.aller("etudes")).pack(side="right")

    if vide:
        demo = app.store.etude_demo()

        def invitation(q):
            carte = ctk.CTkFrame(q, fg_color=t.BLANC, border_color=t.GRIS_CLAIR, border_width=1,
                                 corner_radius=t.RAYON_BLOC)
            dedans = ctk.CTkFrame(carte, fg_color="transparent")
            dedans.pack(fill="both", expand=True, padx=24, pady=22)
            c.label(dedans, "Votre première étude", 17, "bold", t.ENCRE).pack(anchor="w")
            c.label(dedans, "Créez un client, ouvrez son étude : Axio mesure les angles et "
                            "propose les réglages. Aucune vidéo n’est conservée.", 14,
                    couleur=t.TEXTE_DOUX, wrap="auto").pack(fill="x", pady=(8, 0))
            c.bouton_contour(dedans, "Créer une étude", lambda: app.aller("nouvelle")).pack(
                anchor="w", pady=(20, 0))
            return carte

        _cartes(app, p, [demo] if demo else [], invitation)
    else:
        _cartes(app, p, etudes)


# --------------------------------------------------------------------------- #
# Études
# --------------------------------------------------------------------------- #

def page_etudes(app, p, statut=None, page=1, info=None):
    resultat = app.store.etudes(statut, page)
    total, page, pages = resultat["total"], resultat["page"], resultat["pages"]

    _entete(p, "Études", "Toutes les études de votre atelier, les plus récentes d’abord.",
            lambda e: c.bouton_primaire(e, "Nouvelle étude", lambda: app.aller("nouvelle")))
    _info(p, info)

    if total == 0 and statut is None:
        vide = c.bloc(p)
        vide.grid(sticky="ew", pady=(40, 0))
        c.label(vide, "Aucune étude pour l’instant", 20, "bold", t.ENCRE, "titre").pack(
            anchor="w", padx=28, pady=(28, 0))
        c.label(vide, "Une étude rattache une pratique et un objectif à un client. Elle "
                      "s’ouvre en brouillon ; les mesures s’y ajoutent lors de la séance.",
                14.5, couleur=t.TEXTE_DOUX, wrap=640).pack(anchor="w", padx=28, pady=(8, 0))
        c.bouton_contour(vide, "Créer une étude", lambda: app.aller("nouvelle")).pack(
            anchor="w", padx=28, pady=(20, 28))
        return

    filtres = c.Pilules(p, [(None, "Toutes")] + [(s, c.LIBELLES_STATUT[s])
                                                 for s in store_module.STATUTS],
                        statut, lambda s: app.aller("etudes", statut=s), hauteur=38)
    filtres.grid(sticky="w", pady=(32, 0))

    compte = f"{total} étude{'s' if total > 1 else ''}"
    if statut:
        compte += f" · {c.LIBELLES_STATUT[statut].lower()}"
    c.label(p, compte, 13.5, couleur=t.GRIS).grid(sticky="w", pady=(20, 0))

    if not resultat["etudes"]:
        c.label(p, "Aucune étude avec ce statut.", 14.5, couleur=t.TEXTE_DOUX).grid(
            sticky="w", pady=(24, 0))
    else:
        _cartes(app, p, resultat["etudes"])

    if pages > 1:
        nav = ctk.CTkFrame(p, fg_color="transparent")
        nav.grid(sticky="ew", pady=(24, 0))
        precedent = c.bouton_contour(nav, "‹  Précédentes",
                                     lambda: app.aller("etudes", statut=statut, page=page - 1))
        suivant = c.bouton_contour(nav, "Suivantes  ›",
                                   lambda: app.aller("etudes", statut=statut, page=page + 1))
        for b, actif in ((precedent, page > 1), (suivant, page < pages)):
            if not actif:
                b.configure(state="disabled", border_color=t.LIGNE, text_color_disabled=t.GRIS_CLAIR)
        precedent.pack(side="left")
        suivant.pack(side="right")
        c.label(nav, f"Page {page} sur {pages}", 13.5, couleur=t.GRIS).pack(expand=True)


def page_etude(app, p, etude_id, info=None):
    etude = app.store.etude(etude_id)
    if etude is None:
        app.aller("etudes", info="Cette étude n’existe plus.")
        return

    date = c.formater_date(etude["completed_at"] or etude["created_at"])
    mesures = etude["mesures"]
    ecarts = sum(1 for m in mesures if m["status"] == "OUT")
    seance_ouverte = etude["modifiable"] and etude["status"] == "DRAFT"

    c.lien(p, "Toutes les études", lambda: app.aller("etudes"), avec_icone="retour").grid(sticky="w")

    entete = ctk.CTkFrame(p, fg_color="transparent")
    entete.grid(sticky="ew", pady=(20, 0))
    gauche = ctk.CTkFrame(entete, fg_color="transparent")
    gauche.pack(side="left", anchor="n")
    c.surtitre(gauche, "Étude de position").pack(anchor="w")
    titre = c.label(gauche, etude["sujet"], 40, "bold", t.ENCRE, "titre")
    titre.pack(anchor="w", pady=(6, 0))
    if etude["client_id"] and etude["modifiable"]:
        titre.configure(cursor="hand2")
        titre.bind("<Button-1>", lambda e: app.aller("client", client_id=etude["client_id"]))
        titre.bind("<Enter>", lambda e: titre.configure(text_color=t.TEXTE))
        titre.bind("<Leave>", lambda e: titre.configure(text_color=t.ENCRE))

    ligne = ctk.CTkFrame(gauche, fg_color="transparent")
    ligne.pack(anchor="w", pady=(10, 0))
    c.pastille(ligne, c.PASTILLES[etude["status"]]).pack(side="left")
    c.label(ligne, c.LIBELLES_STATUT[etude["status"]], 14, "bold", t.TEXTE).pack(side="left", padx=(8, 0))
    c.label(ligne, f"  ·  {date}", 14, couleur=t.TEXTE_DOUX).pack(side="left")
    if etude["is_demo"]:
        c.badge_demo(ligne).pack(side="left", padx=(12, 0))

    actions = ctk.CTkFrame(entete, fg_color="transparent")
    actions.pack(side="right", anchor="n")
    etat = c.message(p, "")
    etat.grid(sticky="w", pady=(20, 0))
    etat.grid_remove()

    def sur_etat(texte):
        etat.configure(text=texte)
        etat.grid()
        app.update_idletasks()

    if seance_ouverte:
        demarrer = c.bouton_primaire(actions, "Démarrer la séance", None, "camera")

        def lancer():
            demarrer.configure(state="disabled", text="Préparation…")
            app.demarrer_seance(etude_id, sur_etat)

        demarrer.configure(command=lancer)
        demarrer.pack(side="left")
    c.bouton_contour(actions, "Imprimer le compte rendu",
                     lambda: rapport.ouvrir(etude, app.store.atelier()["nom"]),
                     "imprimer").pack(side="left", padx=(12, 0), pady=(4, 0))

    _info(p, info)
    if etude["is_demo"]:
        _info(p, "Étude de démonstration, en lecture seule : elle montre à quoi ressemble "
                 "un compte rendu.")

    termes = [("Pratique", c.LIBELLES_PRATIQUE.get(etude["pratique"], "Non renseignée")),
              ("Objectif", c.LIBELLES_OBJECTIF.get(etude["objectif"], "Non renseigné")),
              ("Taille de cadre estimée", etude["cadre_conseille"] or "—")]

    def terme(q, libelle, valeur):
        b = c.bloc(q)
        c.label(b, libelle.upper(), 11, couleur=t.GRIS, role="mono").pack(anchor="w", padx=20, pady=(18, 0))
        c.label(b, valeur, 17, "bold", t.ENCRE).pack(anchor="w", padx=20, pady=(6, 18))
        return b

    c.grille(p, [lambda q, x=x: terme(q, *x) for x in termes], 3).grid(sticky="ew", pady=(32, 0))

    _section(p, "Mesures" + (f" · {ecarts} hors fourchette" if mesures else ""), (32, 0))
    if not mesures:
        vide = c.bloc(p)
        vide.grid(sticky="ew", pady=(16, 0))
        c.label(vide, "Aucune mesure pour l’instant", 18, "bold", t.ENCRE, "titre").pack(
            anchor="w", padx=28, pady=(24, 0))
        c.label(vide, "Cette étude est en brouillon. Démarrez la séance pour mesurer les angles "
                      "et les comparer à leurs fourchettes cibles." if seance_ouverte
                else "Aucun angle n’a été enregistré pour cette étude.",
                14.5, couleur=t.TEXTE_DOUX, wrap=640).pack(anchor="w", padx=28, pady=(8, 24))
    else:
        tableau = c.Tableau(p, ["Articulation", "Valeur", "Fourchette cible", "Statut"], [3, 2, 3, 3])
        tableau.grid(sticky="ew", pady=(16, 0))
        for m in mesures:
            graisse, couleur = _TON_MESURE[m["status"]]
            tableau.ajouter([
                lambda q, m=m: c.label(q, c.LIBELLES_JOINT[m["joint"]], 14.5, "bold", t.ENCRE),
                lambda q, m=m: c.label(q, c.formater_degres(m["value"]), 14.5, couleur=t.ENCRE, role="mono"),
                lambda q, m=m: c.label(q, f"{c.formater_degres(m['target_min'])} à "
                                          f"{c.formater_degres(m['target_max'])}", 14.5, role="mono"),
                lambda q, m=m, g=graisse, co=couleur: c.label(q, c.LIBELLES_MESURE[m["status"]], 14.5, g, co),
            ])

        sources = c.bloc(p)
        sources.grid(sticky="ew", pady=(12, 0))
        c.label(sources, "D’OÙ VIENNENT LES FOURCHETTES", 11, couleur=t.GRIS, role="mono").pack(
            anchor="w", padx=24, pady=(18, 4))
        for joint in biomeca.ARTICULATIONS:
            if any(m["joint"] == joint for m in mesures):
                c.label(sources, biomeca.SOURCES[joint], 13.5, couleur=t.TEXTE_DOUX,
                        wrap=app.largeur_contenu() - 80).pack(anchor="w", padx=24, pady=(2, 0))
        ctk.CTkFrame(sources, fg_color="transparent", height=14).pack()

    if etude["recommandations"]:
        _section(p, "Recommandations de réglage, par priorité")
        for rang, r in enumerate(etude["recommandations"], 1):
            b = c.bloc(p)
            b.grid(sticky="ew", pady=(16 if rang == 1 else 12, 0))
            ctk.CTkLabel(b, text=str(rang), width=32, height=32, corner_radius=16,
                         fg_color=t.ENCRE, text_color=t.BLANC,
                         font=t.font(13, "bold", "mono")).pack(side="left", anchor="n", padx=(24, 16), pady=24)
            texte = ctk.CTkFrame(b, fg_color="transparent")
            texte.pack(side="left", fill="x", expand=True, pady=22, padx=(0, 24))
            c.label(texte, (c.LIBELLES_JOINT.get(r["joint"]) or "Position générale").upper(), 11,
                    couleur=t.GRIS, role="mono").pack(anchor="w")
            c.label(texte, r["text"], 15, wrap=app.largeur_contenu() - 140).pack(anchor="w", pady=(4, 0))

    c.filet(p, t.LIGNE).grid(sticky="ew", pady=(48, 0))
    c.label(p, c.MENTION, 13, couleur=t.GRIS).grid(sticky="w", pady=(16, 0))

    if etude["modifiable"]:
        b = c.bloc(p)
        b.grid(sticky="ew", pady=(40, 0))
        c.label(b, "Supprimer cette étude", 15, "bold", t.ENCRE).pack(anchor="w", padx=28, pady=(26, 0))
        c.label(b, "La fiche du client est conservée.", 14, couleur=t.TEXTE_DOUX).pack(
            anchor="w", padx=28, pady=(6, 18))

        def supprimer():
            app.store.supprimer_etude(etude_id)
            app.aller("etudes", info="Étude supprimée.")

        c.Suppression(b, "Supprimer l’étude",
                      f"L’étude du {date} pour {etude['sujet']} sera supprimée, avec ses mesures "
                      f"et ses recommandations.", supprimer).pack(anchor="w", padx=28, pady=(0, 28))


def page_nouvelle(app, p, client_id=None, erreur=None):
    clients = app.store.clients_selecteur()

    colonne = ctk.CTkFrame(p, fg_color="transparent", width=560)
    colonne.grid(sticky="n")
    c.titre_page(colonne, "Nouvelle étude",
                 "Choisissez le client, sa pratique et l’objectif du réglage. L’étude s’ouvre "
                 "en brouillon ; les mesures s’y ajoutent lors de la séance.", wrap=560).pack(anchor="w")

    if not clients:
        b = c.bloc(colonne)
        b.pack(fill="x", pady=(24, 0))
        dedans = ctk.CTkFrame(b, fg_color="transparent")
        dedans.pack(fill="x", padx=28, pady=28)
        c.label(dedans, "Commencez par créer un client", 17, "bold", t.ENCRE).pack(anchor="w")
        c.label(dedans, "Une étude se rattache à un client, et votre carnet est vide. Saisissez "
                        "son nom ; les mensurations sont facultatives.", 14,
                couleur=t.TEXTE_DOUX, wrap=500).pack(anchor="w", pady=(6, 20))
        champs = c.ChampsClient(dedans)
        champs.pack(fill="x")
        err = c.message(dedans, "", erreur=True)

        def creer():
            code, nom, taille, ej = champs.lire(store_module)
            if code:
                err.configure(text=c.ERREURS_CLIENT[code])
                err.pack(anchor="w", pady=(14, 0), before=boutons)
                return
            app.aller("nouvelle", client_id=app.store.creer_client(nom, taille, ej))

        boutons = ctk.CTkFrame(dedans, fg_color="transparent")
        boutons.pack(anchor="w", pady=(26, 0))
        c.bouton_primaire(boutons, "Créer le client et continuer", creer, "ajouter").pack(side="left")
        c.lien(boutons, "Annuler", lambda: app.aller("accueil")).pack(side="left", padx=(18, 0))
        champs.nom.focus_set()
        return

    b = c.bloc(colonne)
    b.pack(fill="x", pady=(24, 0))
    dedans = ctk.CTkFrame(b, fg_color="transparent")
    dedans.pack(fill="x", padx=28, pady=28)

    tete = ctk.CTkFrame(dedans, fg_color="transparent")
    tete.pack(fill="x")
    c.etiquette(tete, "Cycliste").pack(side="left")
    c.lien(tete, "Nouveau client", lambda: app.aller("clients")).pack(side="right")

    noms = [cl["nom"] for cl in clients]
    homonymes = {n for n in noms if noms.count(n) > 1}
    libelles = [cl["nom"] + (f" · créé le {c.formater_date(cl['created_at'])}"
                             if cl["nom"] in homonymes else "") for cl in clients]
    par_libelle = dict(zip(libelles, (cl["id"] for cl in clients)))
    preselection = next((l for l, i in par_libelle.items() if i == client_id), None)

    selecteur = ctk.CTkOptionMenu(
        dedans, values=libelles, height=50, corner_radius=12, fg_color=t.FOND_DOUX,
        button_color=t.FOND_DOUX, button_hover_color=t.LIGNE, text_color=t.ENCRE,
        dropdown_fg_color=t.BLANC, dropdown_text_color=t.ENCRE,
        dropdown_hover_color=t.FOND_DOUX, font=t.font(15), dropdown_font=t.font(14))
    selecteur.set(preselection or "Sélectionner un client")
    selecteur.pack(fill="x", pady=(8, 0))

    c.etiquette(dedans, "Pratique").pack(anchor="w", pady=(26, 10))
    pratique = c.Pilules(dedans, list(c.LIBELLES_PRATIQUE.items()))
    pratique.pack(anchor="w")
    c.etiquette(dedans, "Objectif").pack(anchor="w", pady=(26, 10))
    objectif = c.Pilules(dedans, list(c.LIBELLES_OBJECTIF.items()))
    objectif.pack(anchor="w")

    err = c.message(dedans, "", erreur=True)

    def ouvrir():
        cid = par_libelle.get(selecteur.get())
        if not (cid and pratique.valeur and objectif.valeur):
            err.configure(text="Sélectionnez un client, une pratique et un objectif.")
            err.pack(anchor="w", pady=(20, 0), before=boutons)
            return
        eid = app.store.creer_etude(cid, pratique.valeur, objectif.valeur)
        app.aller("etude", etude_id=eid, info="Étude ouverte en brouillon.")

    boutons = ctk.CTkFrame(dedans, fg_color="transparent")
    boutons.pack(anchor="w", pady=(30, 0))
    c.bouton_primaire(boutons, "Ouvrir l’étude", ouvrir).pack(side="left")
    c.lien(boutons, "Annuler", lambda: app.aller("accueil")).pack(side="left", padx=(18, 0))


# --------------------------------------------------------------------------- #
# Clients
# --------------------------------------------------------------------------- #

def page_clients(app, p, info=None):
    clients = app.store.carnet()

    _entete(p, "Clients", "Vos cyclistes, leurs mensurations et l’historique de leurs études. "
                          "Axio n’enregistre aucun contact : seulement le nom et les mesures "
                          "utiles au réglage.")
    _info(p, info)

    b = c.bloc(p)
    b.grid(sticky="ew", pady=(32, 0))
    dedans = ctk.CTkFrame(b, fg_color="transparent")
    dedans.pack(fill="x", padx=28, pady=28)
    c.label(dedans, "Nouveau client", 17, "bold", t.ENCRE).pack(anchor="w")
    c.label(dedans, "Les mensurations sont facultatives. Tout reste modifiable depuis la fiche "
                    "du client.", 14, couleur=t.TEXTE_DOUX).pack(anchor="w", pady=(6, 20))
    champs = c.ChampsClient(dedans)
    champs.pack(fill="x")
    err = c.message(dedans, "", erreur=True)

    def creer():
        code, nom, taille, ej = champs.lire(store_module)
        if code:
            err.configure(text=c.ERREURS_CLIENT[code])
            err.pack(anchor="w", pady=(14, 0), before=bouton)
            return
        app.aller("client", client_id=app.store.creer_client(nom, taille, ej), info="Client créé.")

    bouton = c.bouton_primaire(dedans, "Créer le client", creer, "ajouter")
    bouton.pack(anchor="w", pady=(24, 0))

    _section(p, f"Carnet ({len(clients)})")
    if not clients:
        vide = c.bloc(p)
        vide.grid(sticky="ew", pady=(16, 0))
        c.label(vide, "Votre carnet est vide", 18, "bold", t.ENCRE, "titre").pack(
            anchor="w", padx=28, pady=(24, 0))
        c.label(vide, "Créez votre premier client ci-dessus : ses études et ses mensurations "
                      "seront regroupées sur sa fiche.", 14.5, couleur=t.TEXTE_DOUX,
                wrap=640).pack(anchor="w", padx=28, pady=(8, 24))
        return

    tableau = c.Tableau(p, ["Cycliste", "Taille", "Entrejambe", "Études", "Dernière étude"],
                        [4, 2, 2, 2, 3])
    tableau.grid(sticky="ew", pady=(16, 0))
    for cl in clients:
        tableau.ajouter([
            lambda q, cl=cl: c.lien(q, cl["nom"], lambda: app.aller("client", client_id=cl["id"]),
                                    taille=14.5),
            lambda q, cl=cl: c.label(q, c.formater_cm(cl["taille_cm"]), 14.5, role="mono"),
            lambda q, cl=cl: c.label(q, c.formater_cm(cl["entrejambe_cm"]), 14.5, role="mono"),
            lambda q, cl=cl: c.label(q, str(cl["nombre_etudes"]), 14.5, role="mono"),
            lambda q, cl=cl: c.label(q, c.formater_date(cl["derniere_etude"]), 14.5,
                                     couleur=t.TEXTE_DOUX),
        ])


def page_client(app, p, client_id, info=None):
    client = app.store.fiche_client(client_id)
    if client is None:
        app.aller("clients", info="Ce client n’existe plus.")
        return
    nombre = len(client["etudes"])

    c.lien(p, "Tous les clients", lambda: app.aller("clients"), avec_icone="retour").grid(sticky="w")
    entete = ctk.CTkFrame(p, fg_color="transparent")
    entete.grid(sticky="ew", pady=(20, 0))
    gauche = ctk.CTkFrame(entete, fg_color="transparent")
    gauche.pack(side="left")
    c.surtitre(gauche, "Client").pack(anchor="w")
    c.label(gauche, client["nom"], 40, "bold", t.ENCRE, "titre").pack(anchor="w", pady=(6, 0))
    c.label(gauche, f"Créé le {c.formater_date(client['created_at'])}", 15.5,
            couleur=t.TEXTE_DOUX).pack(anchor="w", pady=(8, 0))
    c.bouton_contour(entete, "Ouvrir une étude",
                     lambda: app.aller("nouvelle", client_id=client_id)).pack(side="right", anchor="n")
    _info(p, info)

    b = c.bloc(p)
    b.grid(sticky="ew", pady=(32, 0))
    dedans = ctk.CTkFrame(b, fg_color="transparent")
    dedans.pack(fill="x", padx=28, pady=28)
    c.label(dedans, "Fiche", 17, "bold", t.ENCRE).pack(anchor="w")
    c.label(dedans, f"Taille {c.formater_cm(client['taille_cm'])}, entrejambe "
                    f"{c.formater_cm(client['entrejambe_cm'])}.", 14,
            couleur=t.TEXTE_DOUX).pack(anchor="w", pady=(6, 20))
    champs = c.ChampsClient(dedans, client["nom"], client["taille_cm"], client["entrejambe_cm"])
    champs.pack(fill="x")
    err = c.message(dedans, "", erreur=True)

    def enregistrer():
        code, nom, taille, ej = champs.lire(store_module)
        if code:
            err.configure(text=c.ERREURS_CLIENT[code])
            err.pack(anchor="w", pady=(14, 0), before=bouton)
            return
        app.store.modifier_client(client_id, nom, taille, ej)
        app.aller("client", client_id=client_id, info="Fiche enregistrée.")

    bouton = c.bouton_contour(dedans, "Enregistrer la fiche", enregistrer)
    bouton.pack(anchor="w", pady=(24, 0))

    _section(p, f"Historique des études ({nombre})")
    if nombre == 0:
        c.label(p, "Aucune étude pour ce client.", 14.5, couleur=t.TEXTE_DOUX).grid(
            sticky="w", pady=(16, 0))
    else:
        _cartes(app, p, client["etudes"])

    b = c.bloc(p)
    b.grid(sticky="ew", pady=(48, 0))
    dedans = ctk.CTkFrame(b, fg_color="transparent")
    dedans.pack(fill="x", padx=28, pady=28)
    c.label(dedans, "Données du client", 17, "bold", t.ENCRE).pack(anchor="w")
    c.label(dedans, f"L’export réunit les mensurations, les études, les mesures et les "
                    f"recommandations de {client['nom']} dans un fichier JSON, à remettre au "
                    f"cycliste s’il demande ses données.", 14, couleur=t.TEXTE_DOUX,
            wrap=640).pack(anchor="w", pady=(6, 18))
    etat = c.message(dedans, "")

    def exporter():
        chemin = filedialog.asksaveasfilename(
            parent=app, defaultextension=".json", filetypes=[("JSON", "*.json")],
            initialfile=f"axio-{_nom_fichier(client['nom'])}.json")
        if chemin:
            app.store.ecrire_json(app.store.export_client(client_id), chemin)
            etat.configure(text=f"Export enregistré : {chemin}")
            etat.pack(anchor="w", pady=(12, 0), after=export)

    export = c.bouton_contour(dedans, "Exporter en JSON", exporter, "telecharger")
    export.pack(anchor="w")

    c.filet(dedans).pack(fill="x", pady=(28, 26))
    c.label(dedans, "Supprimer ce client", 15, "bold", t.ENCRE).pack(anchor="w")
    c.label(dedans, "La suppression emporte la fiche et son historique.", 14,
            couleur=t.TEXTE_DOUX).pack(anchor="w", pady=(6, 18))

    def supprimer():
        app.store.supprimer_client(client_id)
        app.aller("clients", info="Client supprimé, avec toutes ses études.")

    avertissement = (f"{client['nom']} sera supprimé." if nombre == 0 else
                     f"{client['nom']} sera supprimé, avec ses {nombre} étude"
                     f"{'s' if nombre > 1 else ''}, leurs mesures et leurs recommandations.")
    c.Suppression(dedans, "Supprimer le client", avertissement, supprimer).pack(anchor="w")


# --------------------------------------------------------------------------- #
# Paramètres
# --------------------------------------------------------------------------- #

def page_parametres(app, p, info=None):
    atelier = app.store.atelier()
    _entete(p, "Paramètres", "Votre atelier, votre licence et les données enregistrées sur cet "
                             "ordinateur.")
    _info(p, info)

    def ligne(parent, terme, valeur, dernier=False):
        cadre = ctk.CTkFrame(parent, fg_color="transparent")
        cadre.pack(fill="x")
        c.label(cadre, terme, 14, couleur=t.TEXTE_DOUX).pack(side="left", pady=12)
        c.label(cadre, valeur, 14.5, "bold", t.ENCRE, wrap=330).pack(side="right", pady=12)
        if not dernier:
            c.filet(parent).pack(fill="x")

    def compte(q):
        b = c.bloc(q)
        d = ctk.CTkFrame(b, fg_color="transparent")
        d.pack(fill="both", expand=True, padx=28, pady=28)
        c.label(d, "Atelier", 17, "bold", t.ENCRE).pack(anchor="w")
        ligne(d, "Atelier créé le", c.formater_date(store_module.lire_date(atelier["created_at"])))
        ligne(d, "Base locale", os.path.basename(app.store.chemin), dernier=True)
        c.etiquette(d, "Nom de l’atelier", "(affiché sur les comptes rendus)").pack(anchor="w", pady=(14, 0))
        nom = c.champ(d, atelier["nom"] or "", "Atelier Vélo Martin")
        nom.pack(fill="x", pady=(8, 0))

        def enregistrer():
            app.store.renommer_atelier(store_module.lire_nom(nom.get()))
            app.aller("parametres", info="Nom de l’atelier enregistré.")

        c.bouton_contour(d, "Enregistrer", enregistrer).pack(anchor="w", pady=(18, 0))
        return b

    def licence(q):
        b = c.bloc(q)
        d = ctk.CTkFrame(b, fg_color="transparent")
        d.pack(fill="both", expand=True, padx=28, pady=28)
        c.label(d, "Licence", 17, "bold", t.ENCRE).pack(anchor="w")
        ligne(d, "Formule", "Accès illimité")
        ligne(d, "Version", "Bureau, hors ligne", dernier=True)
        c.label(d, "Ce poste crée des études sans limite. Fourchettes calculées par règles "
                   "fixes : même profil, même cible.", 14, couleur=t.TEXTE_DOUX, wrap=460).pack(anchor="w", pady=(14, 0))
        return b

    c.grille(p, [compte, licence], 2).grid(sticky="ew", pady=(40, 0))

    b = c.bloc(p)
    b.grid(sticky="ew")
    d = ctk.CTkFrame(b, fg_color="transparent")
    d.pack(fill="x", padx=28, pady=28)
    c.label(d, "Données de l’atelier", 17, "bold", t.ENCRE).pack(anchor="w")
    c.label(d, "L’export complet réunit tous vos clients (leur nom et leurs mensurations), "
               "leurs études, les mesures et les recommandations dans un fichier JSON. Axio ne "
               "conserve aucune vidéo : il n’y en a donc pas dans l’export.", 14,
            couleur=t.TEXTE_DOUX, wrap=680).pack(anchor="w", pady=(6, 18))
    boutons = ctk.CTkFrame(d, fg_color="transparent")
    boutons.pack(anchor="w")
    etat = c.message(d, "")

    def exporter():
        chemin = filedialog.asksaveasfilename(
            parent=app, defaultextension=".json", filetypes=[("JSON", "*.json")],
            initialfile="axio-atelier.json")
        if chemin:
            app.store.ecrire_json(app.store.export_atelier(), chemin)
            etat.configure(text=f"Export enregistré : {chemin}")
            etat.pack(anchor="w", pady=(12, 0))

    c.bouton_contour(boutons, "Exporter toutes les données en JSON", exporter,
                     "telecharger").pack(side="left")
    c.bouton_contour(boutons, "Ouvrir le dossier des données",
                     lambda: os.startfile(os.path.dirname(app.store.chemin)),
                     "dossier").pack(side="left", padx=(12, 0))

    b = c.bloc(p)
    b.grid(sticky="ew", pady=(16, 0))
    d = ctk.CTkFrame(b, fg_color="transparent")
    d.pack(fill="x", padx=28, pady=28)
    c.label(d, "Données d’exemple", 17, "bold", t.ENCRE).pack(anchor="w")
    c.label(d, "Ajoute quatre clients fictifs et leurs études terminées, pour présenter Axio "
               "sur un atelier déjà actif. Ils se suppriment comme n’importe quel client.", 14,
            couleur=t.TEXTE_DOUX, wrap=680).pack(anchor="w", pady=(6, 18))

    def charger():
        n = app.store.charger_exemples()
        app.aller("accueil") if n else None

    c.bouton_contour(d, "Charger les données d’exemple", charger).pack(anchor="w")
