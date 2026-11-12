-- One LCP and one admin for the whole installation, the LC-wide counterpart
-- of one_vp_per_department.
--
-- The validator already refuses a second holder, but a check-then-insert can
-- lose a race: two people holding the setup code submitting at the same
-- instant would both pass the check. These indexes make the database the
-- decider, exactly as the VP rule does.
--
-- Unique on a constant rather than on a column: the predicate already narrows
-- the index to a single role, so one row is all it can ever hold.
CREATE UNIQUE INDEX "one_lcp" ON "User"((TRUE))
  WHERE "role" = 'LCP' AND "isDisabled" = false;

CREATE UNIQUE INDEX "one_admin" ON "User"((TRUE))
  WHERE "role" = 'ADMIN' AND "isDisabled" = false;
