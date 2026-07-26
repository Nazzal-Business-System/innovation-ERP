-- CreateEnum
CREATE TYPE "OpportunityEventType" AS ENUM (
  'CREATED',
  'STAGE_CHANGED',
  'OWNER_CHANGED',
  'VALUE_UPDATED',
  'PROBABILITY_UPDATED',
  'CLOSE_DATE_UPDATED',
  'TITLE_UPDATED',
  'NOTES_UPDATED',
  'ACTIVITY_LINKED'
);

-- CreateTable
CREATE TABLE "opportunity_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "type" "OpportunityEventType" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_events_organization_id_opportunity_id_created_at_idx"
  ON "opportunity_events"("organization_id", "opportunity_id", "created_at");

-- AddForeignKey
ALTER TABLE "opportunity_events"
  ADD CONSTRAINT "opportunity_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "opportunity_events"
  ADD CONSTRAINT "opportunity_events_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "opportunity_events"
  ADD CONSTRAINT "opportunity_events_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
