-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('draft', 'ready_send', 'sent', 'analyzed');

-- CreateEnum
CREATE TYPE "EmailTag" AS ENUM ('unread', 'read', 'sent', 'important');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'support',
ADD COLUMN     "manualReply" TEXT;
