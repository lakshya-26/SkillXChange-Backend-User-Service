/*
  Warnings:

  - Added the required column `profession` to the `user_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."user_details" ADD COLUMN     "profession" TEXT NOT NULL;
