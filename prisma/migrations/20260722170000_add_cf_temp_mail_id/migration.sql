-- CreateSequence
CREATE SEQUENCE "forward_emails_cf_temp_id_seq";

-- AlterTable
ALTER TABLE "forward_emails" ADD COLUMN "cf_temp_id" INTEGER;

-- Backfill existing mail IDs in receive order.
WITH "ranked_forward_emails" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC)::INTEGER AS "cf_temp_id"
  FROM "forward_emails"
)
UPDATE "forward_emails" AS "mail"
SET "cf_temp_id" = "ranked"."cf_temp_id"
FROM "ranked_forward_emails" AS "ranked"
WHERE "mail"."id" = "ranked"."id";

SELECT setval(
  '"forward_emails_cf_temp_id_seq"',
  COALESCE((SELECT MAX("cf_temp_id") FROM "forward_emails"), 0) + 1,
  false
);

ALTER SEQUENCE "forward_emails_cf_temp_id_seq"
OWNED BY "forward_emails"."cf_temp_id";

ALTER TABLE "forward_emails"
ALTER COLUMN "cf_temp_id" SET DEFAULT nextval('"forward_emails_cf_temp_id_seq"'),
ALTER COLUMN "cf_temp_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "forward_emails_cf_temp_id_key"
ON "forward_emails"("cf_temp_id");
