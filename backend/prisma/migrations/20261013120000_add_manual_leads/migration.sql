-- Marks EPs entered by hand on the manual leads page, so the normal dispatch
-- pool can exclude them. Additive and defaulted, so existing rows are
-- unaffected and read as EXPA-sourced.

ALTER TABLE "Ep" ADD COLUMN "addedManually" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Ep_addedManually_idx" ON "Ep"("addedManually");
