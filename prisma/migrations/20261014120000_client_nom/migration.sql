-- Nom du cycliste sur la fiche client.
--
-- Les velocistes reconnaissent leurs clients par leur nom, pas par un code :
-- la fiche porte desormais "nom" (« Prenom Nom »), et "code" devient une
-- reference secondaire. Les fiches existantes recoivent leur code comme nom,
-- a renommer depuis l'interface.

-- AlterTable : ajoute nullable, rempli, puis verrouille.
ALTER TABLE "Client" ADD COLUMN "nom" TEXT;
UPDATE "Client" SET "nom" = "code" WHERE "nom" IS NULL;
ALTER TABLE "Client" ALTER COLUMN "nom" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Client_userId_nom_idx" ON "Client"("userId", "nom");
