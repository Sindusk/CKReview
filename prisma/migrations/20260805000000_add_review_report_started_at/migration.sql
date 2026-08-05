-- AlterTable: when the underlying log was recorded, as opposed to when the
-- review was attached to the static (addedAt). Stays NULL for every
-- existing review — the value can only come from the WCL/FFLogs report
-- itself, so it fills in the next time each review is resynced from a
-- client that has the report open. The dashboard renders NULL as "—".
ALTER TABLE "StaticReview" ADD COLUMN     "reportStartedAt" TIMESTAMP(3);
