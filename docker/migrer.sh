#!/bin/sh
# Tache ponctuelle du service `migrate` : applique les migrations en attente,
# puis charge le jeu de demonstration. Le seed est idempotent (identifiants
# fixes + upsert) : le rejouer a chaque demarrage ne cree aucun doublon.
#
# Ce fichier doit rester en fins de ligne LF (voir .gitattributes) : en CRLF,
# `sh` echoue dans le conteneur Linux.
set -eu

# Le fichier de config ne porte pas le nom par defaut : on le passe
# explicitement plutot que de dependre de la detection de la CLI.
CONFIG="prisma7.config.ts"

echo "[migrate] application des migrations"
npx prisma migrate deploy --config "$CONFIG"

if [ "${AXIO_SEED:-1}" = "1" ]; then
  echo "[migrate] chargement du jeu de demonstration"
  npx prisma db seed --config "$CONFIG"
else
  echo "[migrate] seed ignore (AXIO_SEED=${AXIO_SEED})"
fi

echo "[migrate] termine"
