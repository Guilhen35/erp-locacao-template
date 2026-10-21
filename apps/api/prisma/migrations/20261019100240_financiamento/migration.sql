/*
  Warnings:

  - A unique constraint covering the columns `[financing_id,installment_number]` on the table `financial_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "financial_entries" ADD COLUMN     "financing_id" UUID;

-- CreateTable
CREATE TABLE "machine_financings" (
    "id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "lender" VARCHAR(200) NOT NULL,
    "installment_amount" DECIMAL(12,2) NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "first_due_date" DATE NOT NULL,
    "paid_before" INTEGER NOT NULL DEFAULT 0,
    "payoff_amount" DECIMAL(12,2),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_financings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_financings_machine_id_key" ON "machine_financings"("machine_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_entries_financing_id_installment_number_key" ON "financial_entries"("financing_id", "installment_number");

-- AddForeignKey
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_financing_id_fkey" FOREIGN KEY ("financing_id") REFERENCES "machine_financings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_financings" ADD CONSTRAINT "machine_financings_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "machine_financings" ADD CONSTRAINT "machine_financings_values_check" CHECK (installment_amount > 0 AND installment_count BETWEEN 1 AND 240 AND paid_before BETWEEN 0 AND installment_count AND (payoff_amount IS NULL OR payoff_amount >= 0));
