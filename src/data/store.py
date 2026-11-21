"""
store.py — Base locale SQLite du logiciel de bureau.

Même modèle que le dashboard web (prisma/schema.prisma sur web_docker),
réduit à un seul atelier : pas de compte, pas d'abonnement, tout reste sur
la machine. Règle produit conservée : AUCUNE vidéo n'est stockée, seulement
les mesures chiffrées et les consignes qui en découlent.

Emplacement : %APPDATA%/Axio/axio.db (ou $AXIO_DATA_DIR/axio.db), hors du
dossier d'installation pour survivre à une mise à jour de l'exécutable.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta

from src.core import biomeca

LONGUEUR_NOM_MAX = 80
BORNES_TAILLE = (100, 230)
BORNES_ENTREJAMBE = (50, 120)

STATUTS = ["DRAFT", "PROCESSING", "COMPLETED", "FAILED"]
PAR_PAGE = 12

_SCHEMA = """
CREATE TABLE IF NOT EXISTS atelier (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nom TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS client (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  taille_cm REAL,
  entrejambe_cm REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS client_nom ON client(nom);
CREATE TABLE IF NOT EXISTS study (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES client(id) ON DELETE CASCADE,
  titre TEXT,
  pratique TEXT,
  objectif TEXT,
  plages_seance TEXT,
  cadre_conseille TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS study_client ON study(client_id);
CREATE TABLE IF NOT EXISTS measurement (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES study(id) ON DELETE CASCADE,
  joint TEXT NOT NULL,
  value REAL NOT NULL,
  target_min REAL NOT NULL,
  target_max REAL NOT NULL,
  status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS measurement_study ON measurement(study_id);
CREATE TABLE IF NOT EXISTS recommendation (
  id TEXT PRIMARY KEY,
  study_id TEXT NOT NULL REFERENCES study(id) ON DELETE CASCADE,
  joint TEXT,
  text TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS recommendation_study ON recommendation(study_id);
"""


def dossier_donnees() -> str:
    base = os.getenv("AXIO_DATA_DIR") or os.path.join(
        os.getenv("APPDATA") or os.path.expanduser("~"), "Axio")
    os.makedirs(base, exist_ok=True)
    return base


def _maintenant() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _id() -> str:
    return uuid.uuid4().hex


def lire_date(texte):
    return datetime.fromisoformat(texte) if texte else None


def lire_nom(brut: str):
    """Nom nettoyé, ou None s'il est vide ou trop long."""
    nom = " ".join((brut or "").split())
    return nom if 0 < len(nom) <= LONGUEUR_NOM_MAX else None


def lire_mensuration(brut: str, bornes):
    """(ok, valeur) : vide = (True, None) ; « 84,5 » accepté."""
    texte = (brut or "").strip().replace(",", ".")
    if not texte:
        return True, None
    try:
        valeur = float(texte)
    except ValueError:
        return False, None
    if not (bornes[0] <= valeur <= bornes[1]):
        return False, None
    return True, round(valeur * 2) / 2


class Store:
    def __init__(self, chemin: str = None):
        self.chemin = chemin or os.path.join(dossier_donnees(), "axio.db")
        self._db = sqlite3.connect(self.chemin)
        self._db.row_factory = sqlite3.Row
        self._db.execute("PRAGMA foreign_keys = ON")
        self._db.executescript(_SCHEMA)
        if self._db.execute("SELECT 1 FROM atelier").fetchone() is None:
            self._db.execute("INSERT INTO atelier (id, nom, created_at) VALUES (1, NULL, ?)",
                             (_maintenant(),))
        self._db.commit()
        self._poser_demo()

    def fermer(self):
        self._db.close()

    # ------------------------------------------------------------------ #
    # Atelier
    # ------------------------------------------------------------------ #
    def atelier(self) -> dict:
        return dict(self._db.execute("SELECT * FROM atelier").fetchone())

    def renommer_atelier(self, nom):
        self._db.execute("UPDATE atelier SET nom = ? WHERE id = 1", (nom,))
        self._db.commit()

    # ------------------------------------------------------------------ #
    # Tableau de bord
    # ------------------------------------------------------------------ #
    def statistiques(self) -> dict:
        debut_mois = datetime.now().replace(day=1, hour=0, minute=0, second=0,
                                            microsecond=0).isoformat()
        q = self._db.execute(
            """SELECT
                 (SELECT COUNT(*) FROM study WHERE is_demo = 0 AND status = 'COMPLETED'),
                 (SELECT COUNT(*) FROM client WHERE id NOT IN
                    (SELECT client_id FROM study WHERE is_demo = 1 AND client_id IS NOT NULL)),
                 (SELECT COUNT(*) FROM study WHERE is_demo = 0 AND created_at >= ?),
                 (SELECT COUNT(*) FROM measurement m JOIN study s ON s.id = m.study_id
                    WHERE s.is_demo = 0 AND m.status = 'OUT')""",
            (debut_mois,)).fetchone()
        return {"etudes_realisees": q[0], "clients_suivis": q[1],
                "etudes_ce_mois": q[2], "ecarts_detectes": q[3]}

    def _etudes(self, where: str, params=(), limite=None, decalage=0) -> list:
        sql = f"""SELECT s.*, c.nom AS client_nom FROM study s
                  LEFT JOIN client c ON c.id = s.client_id
                  WHERE {where} ORDER BY s.created_at DESC"""
        if limite is not None:
            sql += f" LIMIT {int(limite)} OFFSET {int(decalage)}"
        etudes = [self._etude(r) for r in self._db.execute(sql, params)]
        self._joindre_mesures(etudes)
        return etudes

    @staticmethod
    def _etude(r) -> dict:
        e = dict(r)
        e["is_demo"] = bool(e["is_demo"])
        e["created_at"] = lire_date(e["created_at"])
        e["completed_at"] = lire_date(e["completed_at"])
        e["sujet"] = e.get("client_nom") or e.get("titre") or "Étude sans client"
        return e

    def _joindre_mesures(self, etudes: list):
        if not etudes:
            return
        par_id = {e["id"]: e for e in etudes}
        for e in etudes:
            e["mesures"] = []
        marques = ",".join("?" * len(par_id))
        for m in self._db.execute(
                f"SELECT * FROM measurement WHERE study_id IN ({marques})",
                list(par_id)):
            par_id[m["study_id"]]["mesures"].append(dict(m))
        ordre = {j: i for i, j in enumerate(biomeca.ARTICULATIONS)}
        for e in etudes:
            e["mesures"].sort(key=lambda m: ordre.get(m["joint"], 9))

    def etudes_recentes(self, limite=6) -> list:
        return self._etudes("s.is_demo = 0", limite=limite)

    def etude_demo(self):
        etudes = self._etudes("s.is_demo = 1", limite=1)
        return etudes[0] if etudes else None

    def etudes(self, statut=None, page=1) -> dict:
        where, params = "s.is_demo = 0", []
        if statut:
            where += " AND s.status = ?"
            params.append(statut)
        total = self._db.execute(
            f"SELECT COUNT(*) FROM study s WHERE {where}", params).fetchone()[0]
        pages = max(1, -(-total // PAR_PAGE))
        page = min(max(1, page), pages)
        return {"etudes": self._etudes(where, params, PAR_PAGE, (page - 1) * PAR_PAGE),
                "total": total, "page": page, "pages": pages}

    def etude(self, etude_id):
        etudes = self._etudes("s.id = ?", (etude_id,))
        if not etudes:
            return None
        e = etudes[0]
        e["recommandations"] = [dict(r) for r in self._db.execute(
            "SELECT * FROM recommendation WHERE study_id = ? ORDER BY priority", (etude_id,))]
        e["modifiable"] = not e["is_demo"]
        return e

    # ------------------------------------------------------------------ #
    # Clients
    # ------------------------------------------------------------------ #
    @staticmethod
    def _client(r) -> dict:
        c = dict(r)
        c["created_at"] = lire_date(c["created_at"])
        return c

    def carnet(self) -> list:
        lignes = self._db.execute(
            """SELECT c.*, COUNT(s.id) AS nombre_etudes,
                      MAX(COALESCE(s.completed_at, s.created_at)) AS derniere_etude
               FROM client c LEFT JOIN study s ON s.client_id = c.id
               WHERE c.id NOT IN (SELECT client_id FROM study WHERE is_demo = 1
                                  AND client_id IS NOT NULL)
               GROUP BY c.id ORDER BY c.nom COLLATE NOCASE, c.created_at DESC""")
        clients = []
        for r in lignes:
            c = self._client(r)
            c["derniere_etude"] = lire_date(c["derniere_etude"])
            clients.append(c)
        return clients

    def clients_selecteur(self) -> list:
        return [self._client(r) for r in self._db.execute(
            """SELECT * FROM client WHERE id NOT IN (SELECT client_id FROM study
                 WHERE is_demo = 1 AND client_id IS NOT NULL)
               ORDER BY nom COLLATE NOCASE, created_at DESC""")]

    def fiche_client(self, client_id):
        r = self._db.execute("SELECT * FROM client WHERE id = ?", (client_id,)).fetchone()
        if r is None:
            return None
        c = self._client(r)
        c["etudes"] = self._etudes("s.client_id = ?", (client_id,))
        return c

    def creer_client(self, nom, taille_cm, entrejambe_cm) -> str:
        cid = _id()
        self._db.execute(
            "INSERT INTO client (id, nom, taille_cm, entrejambe_cm, created_at) VALUES (?,?,?,?,?)",
            (cid, nom, taille_cm, entrejambe_cm, _maintenant()))
        self._db.commit()
        return cid

    def modifier_client(self, client_id, nom, taille_cm, entrejambe_cm):
        self._db.execute(
            "UPDATE client SET nom = ?, taille_cm = ?, entrejambe_cm = ? WHERE id = ?",
            (nom, taille_cm, entrejambe_cm, client_id))
        self._db.commit()

    def supprimer_client(self, client_id):
        self._db.execute("DELETE FROM client WHERE id = ?", (client_id,))
        self._db.commit()

    # ------------------------------------------------------------------ #
    # Études et séance
    # ------------------------------------------------------------------ #
    def creer_etude(self, client_id, pratique, objectif) -> str:
        eid = _id()
        self._db.execute(
            "INSERT INTO study (id, client_id, pratique, objectif, created_at) VALUES (?,?,?,?,?)",
            (eid, client_id, pratique, objectif, _maintenant()))
        self._db.commit()
        return eid

    def supprimer_etude(self, etude_id):
        self._db.execute("DELETE FROM study WHERE id = ? AND is_demo = 0", (etude_id,))
        self._db.commit()

    def contexte_seance(self, etude_id):
        """Ce qu'il faut pour ouvrir la séance d'un brouillon de l'atelier,
        None sinon. `plages_seance` est None tant qu'elles ne sont pas figées."""
        r = self._db.execute(
            """SELECT s.*, c.nom AS client_nom, c.taille_cm, c.entrejambe_cm FROM study s
               LEFT JOIN client c ON c.id = s.client_id
               WHERE s.id = ? AND s.is_demo = 0 AND s.status = 'DRAFT'""",
            (etude_id,)).fetchone()
        if r is None:
            return None
        return {"etude_id": etude_id, "sujet": r["client_nom"] or r["titre"] or "Étude",
                "pratique": r["pratique"], "objectif": r["objectif"],
                "taille_cm": r["taille_cm"], "entrejambe_cm": r["entrejambe_cm"],
                "plages_seance": biomeca.plages_seance_depuis_json(r["plages_seance"])}

    def figer_plages(self, etude_id, ps: dict):
        self._db.execute("UPDATE study SET plages_seance = ? WHERE id = ? AND status = 'DRAFT'",
                         (biomeca.plages_seance_vers_json(ps), etude_id))
        self._db.commit()

    def ouvrir_seance(self, etude_id):
        """Fourchettes de la séance, calculées une fois puis figées sur
        l'étude. None si l'étude n'est pas un brouillon de l'atelier.
        Les fourchettes déjà figées (y compris d'anciennes études calculées
        par Gemini) sont relues telles quelles."""
        contexte = self.contexte_seance(etude_id)
        if contexte is None:
            return None
        if contexte["plages_seance"] is None:
            ps = biomeca.calculer_plages_seance(
                contexte["pratique"], contexte["objectif"], contexte["taille_cm"],
                contexte["entrejambe_cm"])
            self.figer_plages(etude_id, ps)
            contexte["plages_seance"] = ps
        return contexte

    def enregistrer_seance(self, etude_id, valeurs: dict) -> bool:
        """Mesures + consignes + cadre, étude terminée. Faux si aucune
        valeur ou si l'étude n'est plus un brouillon."""
        valeurs = {j: v for j, v in valeurs.items() if v is not None}
        contexte = self.ouvrir_seance(etude_id)
        if contexte is None or not valeurs:
            return False
        ps = contexte["plages_seance"]
        constats = biomeca.etablir_constats(valeurs, ps["plages"], ps["conseils"],
                                            contexte["entrejambe_cm"])
        cadre = biomeca.estimer_cadre(contexte["pratique"], contexte["taille_cm"],
                                      contexte["entrejambe_cm"])
        with self._db:
            for c in constats:
                self._db.execute(
                    "INSERT INTO measurement VALUES (?,?,?,?,?,?,?)",
                    (_id(), etude_id, c["joint"], c["valeur"], c["plage"][0],
                     c["plage"][1], c["statut"]))
            for rang, c in enumerate(biomeca.consignes_par_priorite(constats), 1):
                self._db.execute("INSERT INTO recommendation VALUES (?,?,?,?,?)",
                                 (_id(), etude_id, c["joint"], c["consigne"], rang))
            self._db.execute(
                """UPDATE study SET status = 'COMPLETED', completed_at = ?,
                   cadre_conseille = ? WHERE id = ?""",
                (_maintenant(), cadre, etude_id))
        return True

    # ------------------------------------------------------------------ #
    # Export
    # ------------------------------------------------------------------ #
    def _etude_export(self, e) -> dict:
        complete = self.etude(e["id"])
        return {
            "date": (complete["completed_at"] or complete["created_at"]).isoformat(),
            "statut": complete["status"], "pratique": complete["pratique"],
            "objectif": complete["objectif"], "cadreConseille": complete["cadre_conseille"],
            "mesures": [{"articulation": m["joint"].upper(), "valeur": m["value"],
                         "fourchette": [m["target_min"], m["target_max"]],
                         "statut": m["status"]} for m in complete["mesures"]],
            "recommandations": [{"articulation": (r["joint"] or "").upper() or None,
                                 "texte": r["text"], "priorite": r["priority"]}
                                for r in complete["recommandations"]],
        }

    def export_client(self, client_id) -> dict:
        c = self.fiche_client(client_id)
        return {"exporteLe": _maintenant(), "client": {
            "nom": c["nom"], "tailleCm": c["taille_cm"], "entrejambeCm": c["entrejambe_cm"],
            "creeLe": c["created_at"].isoformat(),
            "etudes": [self._etude_export(e) for e in c["etudes"]]}}

    def export_atelier(self) -> dict:
        a = self.atelier()
        return {"exporteLe": _maintenant(), "atelier": a["nom"],
                "clients": [self.export_client(c["id"])["client"] for c in self.carnet()]}

    @staticmethod
    def ecrire_json(donnees: dict, chemin: str):
        with open(chemin, "w", encoding="utf-8") as f:
            json.dump(donnees, f, ensure_ascii=False, indent=2)

    # ------------------------------------------------------------------ #
    # Données de démonstration
    # ------------------------------------------------------------------ #
    def _poser_demo(self):
        """L'étude vitrine du seed web : affichée quand l'atelier n'a encore
        aucune étude, en lecture seule, hors compteurs."""
        if self._db.execute("SELECT 1 FROM study WHERE is_demo = 1").fetchone():
            return
        cid = _id()
        with self._db:
            self._db.execute("INSERT INTO client VALUES (?,?,?,?,?)",
                             (cid, "Camille Martin", 178, 84.5, _maintenant()))
            eid = _id()
            self._db.execute(
                """INSERT INTO study (id, client_id, pratique, objectif, cadre_conseille,
                   status, is_demo, created_at, completed_at)
                   VALUES (?,?,?,?,?,'COMPLETED',1,?,?)""",
                (eid, cid, "ROUTE", "CONFORT",
                 biomeca.estimer_cadre("ROUTE", 178, 84.5), _maintenant(), _maintenant()))
            for joint, v, mn, mx, st in [("knee", 156, 140, 150, "OUT"),
                                         ("hip", 54, 45, 60, "OK"),
                                         ("elbow", 153, 150, 165, "OK"),
                                         ("shoulder", 73, 85, 100, "OUT")]:
                self._db.execute("INSERT INTO measurement VALUES (?,?,?,?,?,?,?)",
                                 (_id(), eid, joint, v, mn, mx, st))
            for rang, (joint, texte) in enumerate([
                ("knee", "Selle trop haute : le genou s'ouvre à 156° en bas de course, pour une "
                         "cible de 140 à 150°. Descendre la selle de 8 à 12 mm, puis refaire une "
                         "mesure — 5 mm de tige de selle déplacent l'angle d'environ 2°."),
                ("shoulder", "Buste trop ramassé : l'angle épaule tombe à 73° pour une cible de "
                             "85 à 100°. Allonger la potence de 10 à 20 mm, ou reculer la selle "
                             "de 5 à 10 mm. Régler la selle en premier : elle conditionne le reste."),
            ], 1):
                self._db.execute("INSERT INTO recommendation VALUES (?,?,?,?,?)",
                                 (_id(), eid, joint, texte, rang))

    def charger_exemples(self) -> int:
        """Quelques clients et études terminées, pour présenter le logiciel
        sur un atelier déjà vivant. Renvoie le nombre d'études créées."""
        exemples = [
            ("Léa Fontaine", 166, 77, "ROUTE", "CONFORT",
             {"knee": 147.2, "hip": 58.4, "elbow": 158.0, "shoulder": 88.1}, 2),
            ("Thomas Girard", 184, 88.5, "CHRONO", "AERO",
             {"knee": 155.8, "hip": 38.9, "elbow": 104.5, "shoulder": 79.2}, 6),
            ("Inès Moreau", 172, 81, "GRAVEL", "MIXTE",
             {"knee": 137.5, "hip": 52.1, "elbow": 151.3, "shoulder": 84.0}, 11),
            ("Hugo Lambert", 179, 83, "ROUTE", "MIXTE",
             {"knee": 144.6, "hip": 47.3, "elbow": 168.9, "shoulder": 92.4}, 19),
            ("Léa Fontaine", 166, 77, "ROUTE", "MIXTE", None, 0),
        ]
        ids_par_nom = {}
        creees = 0
        for nom, taille, ej, pratique, objectif, valeurs, il_y_a in exemples:
            cid = ids_par_nom.get(nom) or self.creer_client(nom, taille, ej)
            ids_par_nom[nom] = cid
            eid = self.creer_etude(cid, pratique, objectif)
            date = (datetime.now() - timedelta(days=il_y_a)).isoformat(timespec="seconds")
            self._db.execute("UPDATE study SET created_at = ? WHERE id = ?", (date, eid))
            self._db.commit()
            if valeurs:
                self.ouvrir_seance(eid)
                self.enregistrer_seance(eid, valeurs)
                self._db.execute("UPDATE study SET completed_at = ? WHERE id = ?", (date, eid))
                self._db.commit()
            creees += 1
        return creees
