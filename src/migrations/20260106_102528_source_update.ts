import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" ADD COLUMN "identity_key" varchar;
  ALTER TABLE "sources" ADD COLUMN "rate_limit_request_per_second" numeric;
  ALTER TABLE "sources" ADD COLUMN "rate_limit_request_per_minute" numeric;
  ALTER TABLE "sources" ADD COLUMN "rate_limit_request_per_hour" numeric;
  ALTER TABLE "sources" ADD COLUMN "rate_limit_request_per_day" numeric;
  ALTER TABLE "sources" ADD COLUMN "rate_limit_request_per_month" numeric;
  ALTER TABLE "entries" ADD COLUMN "identity_value" varchar DEFAULT '' NOT NULL;
  CREATE UNIQUE INDEX "sources_base_url_idx" ON "sources" USING btree ("base_url");
  CREATE UNIQUE INDEX "sources_name_idx" ON "sources" USING btree ("name");
  CREATE UNIQUE INDEX "entries_identity_value_idx" ON "entries" USING btree ("identity_value");
  ALTER TABLE "sources" DROP COLUMN "rate_limit";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "sources_base_url_idx";
  DROP INDEX "sources_name_idx";
  DROP INDEX "entries_identity_value_idx";
  ALTER TABLE "sources" ADD COLUMN "rate_limit" jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE "sources" DROP COLUMN "identity_key";
  ALTER TABLE "sources" DROP COLUMN "rate_limit_request_per_second";
  ALTER TABLE "sources" DROP COLUMN "rate_limit_request_per_minute";
  ALTER TABLE "sources" DROP COLUMN "rate_limit_request_per_hour";
  ALTER TABLE "sources" DROP COLUMN "rate_limit_request_per_day";
  ALTER TABLE "sources" DROP COLUMN "rate_limit_request_per_month";
  ALTER TABLE "entries" DROP COLUMN "identity_value";`)
}
