-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "calculationType" TEXT NOT NULL,
    "sign" TEXT NOT NULL DEFAULT '+',
    "taxClass" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "parentAndOr" TEXT NOT NULL DEFAULT 'and',
    "feeProductId" TEXT,
    "feeVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionGroup" (
    "id" TEXT NOT NULL,
    "feeRuleId" TEXT NOT NULL,
    "andOr" TEXT NOT NULL DEFAULT 'and',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "conditionGroupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeeRule_shopId_idx" ON "FeeRule"("shopId");

-- CreateIndex
CREATE INDEX "FeeRule_status_idx" ON "FeeRule"("status");

-- CreateIndex
CREATE INDEX "FeeRule_priority_idx" ON "FeeRule"("priority");

-- CreateIndex
CREATE INDEX "ConditionGroup_feeRuleId_idx" ON "ConditionGroup"("feeRuleId");

-- CreateIndex
CREATE INDEX "Condition_conditionGroupId_idx" ON "Condition"("conditionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");

-- CreateIndex
CREATE INDEX "Subscription_shopId_idx" ON "Subscription"("shopId");

-- AddForeignKey
ALTER TABLE "ConditionGroup" ADD CONSTRAINT "ConditionGroup_feeRuleId_fkey" FOREIGN KEY ("feeRuleId") REFERENCES "FeeRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_conditionGroupId_fkey" FOREIGN KEY ("conditionGroupId") REFERENCES "ConditionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
