-- Client pseudonymise, pratique et objectif sur l'etude.
--
-- Le serveur ne doit pas connaitre l'identite du cycliste : "Client".nom,
-- "Client".email et "Client".notes disparaissent, remplaces par un code
-- sequentiel par atelier (AX-0001). Le texte libre de "notes" pouvait porter
-- une information de sante : il n'est pas migre, il est supprime.
--
-- MIGRATION DESTRUCTIVE : les trois colonnes sont perdues. Si la
-- correspondance nom <-> fiche doit etre conservee en boutique, l'exporter
-- AVANT d'appliquer cette migration.

-- CreateEnum
CREATE TYPE "Pratique" AS ENUM ('ROUTE', 'GRAVEL', 'CHRONO');

-- CreateEnum
CREATE TYPE "Objectif" AS ENUM ('CONFORT', 'MIXTE', 'AERO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "dernierNumeroClient" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Study" ADD COLUMN "pratique" "Pratique",
ADD COLUMN "objectif" "Objectif";

-- AlterTable : le code est ajoute nullable, rempli, puis verrouille.
ALTER TABLE "Client" ADD COLUMN "code" TEXT,
ADD COLUMN "tailleCm" DOUBLE PRECISION,
ADD COLUMN "entrejambeCm" DOUBLE PRECISION;

-- Reprise des fiches existantes : numerotees par atelier, dans l'ordre de
-- creation ("id" departage deux fiches creees au meme instant).
UPDATE "Client" AS c
SET "code" = 'AX-' || LPAD(n."rang"::text, 4, '0')
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", "id") AS "rang"
  FROM "Client"
) AS n
WHERE n."id" = c."id";

-- Le compteur de chaque atelier repart apres sa derniere fiche reprise.
UPDATE "User" AS u
SET "dernierNumeroClient" = t."total"
FROM (
  SELECT "userId", COUNT(*)::int AS "total" FROM "Client" GROUP BY "userId"
) AS t
WHERE t."userId" = u."id";

ALTER TABLE "Client" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable : fin des donnees nominatives et du texte libre.
ALTER TABLE "Client" DROP COLUMN "nom",
DROP COLUMN "email",
DROP COLUMN "notes";

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_code_key" ON "Client"("userId", "code");
