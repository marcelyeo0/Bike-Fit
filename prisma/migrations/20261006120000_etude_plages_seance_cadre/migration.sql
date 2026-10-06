-- AlterTable : fourchettes figees a l ouverture de la seance, et taille de
-- cadre estimee figee a son enregistrement. Deux colonnes nullables : les
-- etudes existantes ne sont pas touchees.
ALTER TABLE "Study" ADD COLUMN     "plagesSeance" JSONB,
ADD COLUMN     "cadreConseille" TEXT;
