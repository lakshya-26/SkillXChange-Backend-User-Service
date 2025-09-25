-- AlterTable
ALTER TABLE "public"."user_details" ALTER COLUMN "phone_number" DROP NOT NULL,
ALTER COLUMN "instagram" DROP NOT NULL,
ALTER COLUMN "twitter" DROP NOT NULL,
ALTER COLUMN "linkedin" DROP NOT NULL,
ALTER COLUMN "github" DROP NOT NULL;
