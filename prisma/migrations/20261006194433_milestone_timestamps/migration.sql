-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "offerAt" TIMESTAMP(3),
ADD COLUMN     "technicalAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "proposalAt" TIMESTAMP(3),
ADD COLUMN     "wonAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "shippedAt" TIMESTAMP(3);
