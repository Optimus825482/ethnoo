-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DRIVER');

-- CreateEnum
CREATE TYPE "BuggyStatus" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'UNANSWERED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('DRIVER', 'GUEST', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'CLICKED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_COMPLETED', 'REQUEST_CANCELLED', 'REQUEST_TIMEOUT', 'DRIVER_STATUS');

-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "logo" TEXT,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    "address" TEXT,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "setup_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "fcm_token" VARCHAR(500),
    "fcm_token_date" TIMESTAMP(3),
    "push_subscription" TEXT,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "qr_code_data" VARCHAR(500),
    "qr_code_path" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buggies" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100),
    "license_plate" VARCHAR(50),
    "icon" VARCHAR(10),
    "status" "BuggyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_location_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buggies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buggy_drivers" (
    "id" SERIAL NOT NULL,
    "buggy_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3),

    CONSTRAINT "buggy_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buggy_requests" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "location_id" INTEGER NOT NULL,
    "completion_location_id" INTEGER,
    "buggy_id" INTEGER,
    "accepted_by_id" INTEGER,
    "guest_name" VARCHAR(255),
    "room_number" VARCHAR(50),
    "has_room" BOOLEAN NOT NULL DEFAULT true,
    "phone" VARCHAR(50),
    "notes" TEXT,
    "guest_fcm_token" VARCHAR(500),
    "guest_fcm_token_expires_at" TIMESTAMP(3),
    "guest_push_subscription" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "cancelled_by" "CancelledBy",
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "timeout_at" TIMESTAMP(3),
    "response_time" INTEGER,
    "completion_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buggy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trail" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "request_id" INTEGER,
    "user_id" INTEGER,
    "notification_type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "token" VARCHAR(500),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotels_code_key" ON "hotels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_hotel_id_idx" ON "users"("hotel_id");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "locations_hotel_id_idx" ON "locations"("hotel_id");

-- CreateIndex
CREATE INDEX "locations_is_active_idx" ON "locations"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "buggies_code_key" ON "buggies"("code");

-- CreateIndex
CREATE INDEX "buggies_hotel_id_idx" ON "buggies"("hotel_id");

-- CreateIndex
CREATE INDEX "buggies_status_idx" ON "buggies"("status");

-- CreateIndex
CREATE INDEX "buggies_current_location_id_idx" ON "buggies"("current_location_id");

-- CreateIndex
CREATE INDEX "buggy_drivers_buggy_id_idx" ON "buggy_drivers"("buggy_id");

-- CreateIndex
CREATE INDEX "buggy_drivers_driver_id_idx" ON "buggy_drivers"("driver_id");

-- CreateIndex
CREATE INDEX "buggy_drivers_is_active_idx" ON "buggy_drivers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "buggy_drivers_buggy_id_driver_id_key" ON "buggy_drivers"("buggy_id", "driver_id");

-- CreateIndex
CREATE INDEX "buggy_requests_hotel_id_idx" ON "buggy_requests"("hotel_id");

-- CreateIndex
CREATE INDEX "buggy_requests_location_id_idx" ON "buggy_requests"("location_id");

-- CreateIndex
CREATE INDEX "buggy_requests_buggy_id_idx" ON "buggy_requests"("buggy_id");

-- CreateIndex
CREATE INDEX "buggy_requests_accepted_by_id_idx" ON "buggy_requests"("accepted_by_id");

-- CreateIndex
CREATE INDEX "buggy_requests_status_idx" ON "buggy_requests"("status");

-- CreateIndex
CREATE INDEX "buggy_requests_requested_at_idx" ON "buggy_requests"("requested_at");

-- CreateIndex
CREATE INDEX "audit_trail_hotel_id_idx" ON "audit_trail"("hotel_id");

-- CreateIndex
CREATE INDEX "audit_trail_user_id_idx" ON "audit_trail"("user_id");

-- CreateIndex
CREATE INDEX "audit_trail_action_idx" ON "audit_trail"("action");

-- CreateIndex
CREATE INDEX "audit_trail_entity_type_entity_id_idx" ON "audit_trail"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_trail_created_at_idx" ON "audit_trail"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_is_active_idx" ON "sessions"("is_active");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "notification_logs_hotel_id_idx" ON "notification_logs"("hotel_id");

-- CreateIndex
CREATE INDEX "notification_logs_request_id_idx" ON "notification_logs"("request_id");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_hotel_id_key_key" ON "system_settings"("hotel_id", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggies" ADD CONSTRAINT "buggies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggies" ADD CONSTRAINT "buggies_current_location_id_fkey" FOREIGN KEY ("current_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_drivers" ADD CONSTRAINT "buggy_drivers_buggy_id_fkey" FOREIGN KEY ("buggy_id") REFERENCES "buggies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_drivers" ADD CONSTRAINT "buggy_drivers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_requests" ADD CONSTRAINT "buggy_requests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_requests" ADD CONSTRAINT "buggy_requests_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_requests" ADD CONSTRAINT "buggy_requests_completion_location_id_fkey" FOREIGN KEY ("completion_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_requests" ADD CONSTRAINT "buggy_requests_buggy_id_fkey" FOREIGN KEY ("buggy_id") REFERENCES "buggies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buggy_requests" ADD CONSTRAINT "buggy_requests_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "buggy_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
