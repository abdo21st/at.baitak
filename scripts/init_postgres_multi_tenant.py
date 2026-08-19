# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql_setup = """
-- 1. Create Enums if not exist
DO $$ BEGIN
    CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create SubscriptionPlan table
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "priceYearly" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxEmployees" INTEGER NOT NULL DEFAULT 10,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "maxProducts" INTEGER NOT NULL DEFAULT 1000,
    "hasAdvancedOcr" BOOLEAN NOT NULL DEFAULT false,
    "hasWhatsAppAlerts" BOOLEAN NOT NULL DEFAULT false,
    "hasInventoryPredict" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Tenant table
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'النشاط الرئيسي',
    "slug" TEXT NOT NULL UNIQUE DEFAULT 'main',
    "customDomain" TEXT UNIQUE,
    "logo" TEXT,
    "phone" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paymentMethod" TEXT,
    "referenceNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert Plans
INSERT INTO "SubscriptionPlan" ("id", "name", "code", "priceMonthly", "priceYearly", "maxEmployees", "maxBranches", "hasAdvancedOcr", "hasWhatsAppAlerts", "hasInventoryPredict", "updatedAt")
VALUES 
  ('plan-basic', 'الباقة الأساسية', 'BASIC', 150.0, 1500.0, 10, 1, false, false, false, NOW()),
  ('plan-pro', 'الباقة الاحترافية', 'PRO', 350.0, 3500.0, 35, 3, true, true, true, NOW()),
  ('plan-ent', 'باقة المؤسسات والشبكات', 'ENTERPRISE', 750.0, 7500.0, 999, 99, true, true, true, NOW())
ON CONFLICT ("code") DO NOTHING;

-- 6. Insert Default Tenant for "صيدلية بيتك"
INSERT INTO "Tenant" ("id", "name", "slug", "status", "planId", "managerName", "updatedAt")
VALUES ('default-tenant', 'صيدلية بيتك', 'baytak', 'ACTIVE', 'plan-pro', 'إدارة صيدلية بيتك', NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = 'صيدلية بيتك', "slug" = 'baytak', "planId" = 'plan-pro';
"""

cmd = f"""
docker exec -i hodoork_postgres psql -U postgres -d hodoork_db << 'EOF'
{sql_setup}
EOF

cd /opt/at.baitak
export DATABASE_URL="postgresql://postgres:postgres_pass_2026@127.0.0.1:5433/hodoork_db?schema=public"
npx prisma db push --accept-data-loss
docker compose restart app
"""

stdin, stdout, stderr = c.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("OUT:\n", out)
print("ERR:\n", err)

c.close()
