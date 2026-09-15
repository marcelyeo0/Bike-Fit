-- Study.clientId devient optionnel et Study.titre apparait.
--
-- Migration non destructive : DROP NOT NULL n'invalide aucune ligne existante
-- (toutes portent deja un clientId, y compris l'etude de demonstration du
-- seed) et la nouvelle colonne est nullable, donc sans DEFAULT a retropropager.
-- La contrainte de cle etrangere "Study_clientId_fkey" reste inchangee : elle
-- ne s'applique qu'aux valeurs non nulles.

-- AlterTable
ALTER TABLE "Study" ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Study" ADD COLUMN "titre" TEXT;
