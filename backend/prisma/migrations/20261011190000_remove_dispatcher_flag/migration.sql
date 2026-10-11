-- Dispatching is no longer a single designated Team Leader. Every Team Leader
-- and VP can now assign leads to any member of their department, so the flag
-- and the signup request that fed it no longer mean anything.

ALTER TABLE "User" DROP COLUMN "isDispatcher";
ALTER TABLE "User" DROP COLUMN "requestedIsDispatcher";
