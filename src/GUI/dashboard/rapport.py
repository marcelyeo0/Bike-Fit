"""
rapport.py — Compte rendu imprimable d'une étude.

Équivalent de l'impression de la page web (`@page A4` + classes `print:`) :
une page HTML autonome au format A4, écrite dans le dossier des données puis
ouverte dans le navigateur, qui lance la boîte d'impression (ou « Enregistrer
en PDF »). Aucune dépendance de mise en page côté Python.
"""

import html
import os
import webbrowser

from src.core import biomeca
from src.data.store import dossier_donnees
from src.GUI.dashboard import composants as c

_TON = {"OK": "ok", "WARNING": "limite", "OUT": "hors"}

_STYLE = """
@page { size: A4; margin: 16mm 15mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: #fff; color: #3A3A3A;
       font: 14px/1.55 "Segoe UI Variable Text", "Segoe UI", Helvetica, Arial, sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 32px 0; }
.atelier { border-bottom: 1px solid #0C0C0C; padding-bottom: 14px; }
.atelier p { margin: 0; }
.atelier .nom { font-size: 20px; font-weight: 600; color: #0C0C0C; letter-spacing: -.02em; }
.surtitre { margin: 28px 0 0; font: 12px "Cascadia Mono", Consolas, monospace;
            text-transform: uppercase; letter-spacing: .08em; color: #8A8A8A; }
h1 { margin: 6px 0 0; font-size: 28px; font-weight: 600; color: #0C0C0C; letter-spacing: -.03em; }
.cadre { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 22px; }
.cadre dt { font: 11px "Cascadia Mono", Consolas, monospace; text-transform: uppercase;
            letter-spacing: .08em; color: #8A8A8A; }
.cadre dd { margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #0C0C0C; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th { text-align: left; font: 600 11px "Cascadia Mono", Consolas, monospace; text-transform: uppercase;
     letter-spacing: .08em; color: #8A8A8A; border-bottom: 1px solid #0C0C0C; padding: 8px 0; }
td, tbody th { padding: 9px 0; border-bottom: 1px solid #EDEDED; break-inside: avoid; }
tbody th { font-weight: 600; font-size: 14px; color: #0C0C0C; text-align: left; }
.mono { font-family: "Cascadia Mono", Consolas, monospace; color: #0C0C0C; }
.ok { color: #5A5A5A; } .limite { font-weight: 600; color: #0C0C0C; }
.hors { font-weight: 600; color: #C0241C; }
ol { list-style: none; margin: 10px 0 0; padding: 0; }
li { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #E9E9E9; break-inside: avoid; }
.rang { flex: none; width: 28px; height: 28px; border-radius: 50%; background: #0C0C0C; color: #fff;
        font: 600 12px/28px "Cascadia Mono", Consolas, monospace; text-align: center; }
li p { margin: 0; }
.sources { margin: 10px 0 0; font-size: 12px; color: #5A5A5A; }
.mention { margin-top: 32px; border-top: 1px solid #0C0C0C; padding-top: 12px; font-size: 12.5px; }
@media screen { body { background: #F6F6F5; } main { background: #fff; padding: 48px 56px;
  margin: 32px auto; border: 1px solid #E9E9E9; border-radius: 24px; } }
"""


def construire(etude: dict, atelier: str) -> str:
    e = html.escape
    date = c.formater_date(etude["completed_at"] or etude["created_at"])
    ecarts = sum(1 for m in etude["mesures"] if m["status"] == "OUT")

    lignes = "".join(
        f"<tr><th scope='row'>{e(c.LIBELLES_JOINT[m['joint']])}</th>"
        f"<td class='mono'>{e(c.formater_degres(m['value']))}</td>"
        f"<td class='mono'>{e(c.formater_degres(m['target_min']))} à "
        f"{e(c.formater_degres(m['target_max']))}</td>"
        f"<td class='{_TON[m['status']]}'>{e(c.LIBELLES_MESURE[m['status']])}</td></tr>"
        for m in etude["mesures"])
    mesures = (f"<table><thead><tr><th>Articulation</th><th>Valeur</th><th>Fourchette cible</th>"
               f"<th>Statut</th></tr></thead><tbody>{lignes}</tbody></table>"
               if etude["mesures"] else "<p>Aucune mesure enregistrée pour cette étude.</p>")

    sources = ""
    if etude["mesures"]:
        joints = {m["joint"] for m in etude["mesures"]}
        sources = "<p class='sources'>" + "<br>".join(
            e(biomeca.SOURCES[j]) for j in biomeca.ARTICULATIONS if j in joints) + "</p>"

    recos = ""
    if etude["recommandations"]:
        items = "".join(
            f"<li><span class='rang'>{i}</span><div><p class='surtitre' style='margin:0'>"
            f"{e(c.LIBELLES_JOINT.get(r['joint']) or 'Position générale')}</p>"
            f"<p>{e(r['text'])}</p></div></li>"
            for i, r in enumerate(etude["recommandations"], 1))
        recos = f"<p class='surtitre'>Recommandations de réglage, par priorité</p><ol>{items}</ol>"

    termes = [("Pratique", c.LIBELLES_PRATIQUE.get(etude["pratique"], "Non renseignée")),
              ("Objectif", c.LIBELLES_OBJECTIF.get(etude["objectif"], "Non renseigné")),
              ("Taille de cadre estimée", etude["cadre_conseille"] or "—")]
    cadre = "".join(f"<div><dt>{e(a)}</dt><dd>{e(b)}</dd></div>" for a, b in termes)

    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Compte rendu · {e(etude['sujet'])} · {e(date)}</title>
<style>{_STYLE}</style></head>
<body onload="setTimeout(function(){{window.print()}}, 300)"><main>
<div class="atelier"><p class="nom">{e(atelier or 'Atelier')}</p>
<p>Compte rendu d’étude de position · {e(date)}</p></div>
<p class="surtitre">Étude de position</p>
<h1>{e(etude['sujet'])}</h1>
<dl class="cadre">{cadre}</dl>
<p class="surtitre">Mesures{f' · {ecarts} hors fourchette' if etude['mesures'] else ''}</p>
{mesures}
{sources}
{recos}
<p class="mention">{e(c.MENTION)}</p>
</main></body></html>"""


def ouvrir(etude: dict, atelier: str) -> str:
    dossier = os.path.join(dossier_donnees(), "comptes-rendus")
    os.makedirs(dossier, exist_ok=True)
    chemin = os.path.join(dossier, f"etude-{etude['id'][:8]}.html")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write(construire(etude, atelier))
    webbrowser.open("file:///" + chemin.replace("\\", "/"))
    return chemin
