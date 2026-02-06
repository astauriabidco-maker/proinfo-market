-- CreateEnum
CREATE TYPE "PickingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('READY', 'SHIPPED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'INSPECTED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PICKING', 'ASSEMBLY', 'QA', 'SHIPPING');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateTable
CREATE TABLE "PickingOrder" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "PickingStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssemblyOrder" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "status" "AssemblyStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingRef" TEXT,
    "status" "ShipmentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Return" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WmsTask" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "operatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "WmsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStep" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "scanRequired" BOOLEAN NOT NULL DEFAULT true,
    "expectedCode" TEXT,
    "scannedCode" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "stepId" TEXT,
    "code" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PickingOrder_assetId_idx" ON "PickingOrder"("assetId");

-- CreateIndex
CREATE INDEX "PickingOrder_status_idx" ON "PickingOrder"("status");

-- CreateIndex
CREATE INDEX "AssemblyOrder_assetId_idx" ON "AssemblyOrder"("assetId");

-- CreateIndex
CREATE INDEX "AssemblyOrder_status_idx" ON "AssemblyOrder"("status");

-- CreateIndex
CREATE INDEX "Shipment_assetId_idx" ON "Shipment"("assetId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Return_assetId_idx" ON "Return"("assetId");

-- CreateIndex
CREATE INDEX "Return_status_idx" ON "Return"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_badge_key" ON "Operator"("badge");

-- CreateIndex
CREATE INDEX "WmsTask_assetId_idx" ON "WmsTask"("assetId");

-- CreateIndex
CREATE INDEX "WmsTask_status_idx" ON "WmsTask"("status");

-- CreateIndex
CREATE INDEX "WmsTask_operatorId_idx" ON "WmsTask"("operatorId");

-- CreateIndex
CREATE INDEX "WmsTask_type_status_idx" ON "WmsTask"("type", "status");

-- CreateIndex
CREATE INDEX "TaskStep_taskId_idx" ON "TaskStep"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStep_taskId_stepOrder_key" ON "TaskStep"("taskId", "stepOrder");

-- CreateIndex
CREATE INDEX "ScanLog_taskId_idx" ON "ScanLog"("taskId");

-- CreateIndex
CREATE INDEX "ScanLog_scannedAt_idx" ON "ScanLog"("scannedAt");

-- AddForeignKey
ALTER TABLE "WmsTask" ADD CONSTRAINT "WmsTask_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WmsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WmsTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
