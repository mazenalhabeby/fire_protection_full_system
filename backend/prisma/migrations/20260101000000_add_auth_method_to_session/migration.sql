-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "authMethod" TEXT NOT NULL DEFAULT 'password';
