-- Lets one person exist in more than one department.
--
-- Someone who ticks two internship types on the sign-up form belongs to two
-- departments, but a lead's id was the EXPA person id, so a second copy could
-- not be stored. Splitting the EXPA id into its own column fixes that without
-- rewriting a single existing row: the first copy keeps the EXPA id as its id,
-- and only additional copies get a generated one.
--
-- Nothing in Comment, ApprovedDetail, StatusHistory or TransitionHistory
-- changes, because Ep.id itself is untouched.

ALTER TABLE "Ep" ADD COLUMN "expaId" TEXT;

-- Existing rows all came from EXPA, so their id is their EXPA id. Leads typed
-- in by hand carry a prefixed id and genuinely have no EXPA id, so they stay
-- null rather than being given a fake one.
UPDATE "Ep" SET "expaId" = "id" WHERE "id" NOT LIKE 'manual-%';

CREATE INDEX "Ep_expaId_idx" ON "Ep"("expaId");

-- One row per person per department. NULL expaIds do not collide in Postgres,
-- so any number of hand-entered leads can sit in the same department.
CREATE UNIQUE INDEX "Ep_expaId_departmentId_key" ON "Ep"("expaId", "departmentId");
