-- CreateEnum
CREATE TYPE "public"."SkillType" AS ENUM ('LEARN', 'TEACH');

-- CreateTable
CREATE TABLE "public"."user_details" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "twitter" TEXT NOT NULL,
    "linkedin" TEXT NOT NULL,
    "github" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_skills" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "type" "public"."SkillType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_details_user_id_key" ON "public"."user_details"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "public"."skills"("name");

-- AddForeignKey
ALTER TABLE "public"."user_details" ADD CONSTRAINT "user_details_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
