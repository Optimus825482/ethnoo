-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ON_DUTY', 'OFF_DUTY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "driver_status" "DriverStatus" NOT NULL DEFAULT 'ON_DUTY',
ADD COLUMN     "last_gps_at" TIMESTAMP(3),
ADD COLUMN     "last_gps_lat" DOUBLE PRECISION,
ADD COLUMN     "last_gps_lng" DOUBLE PRECISION,
ADD COLUMN     "last_heartbeat" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_driver_status_idx" ON "users"("driver_status");
