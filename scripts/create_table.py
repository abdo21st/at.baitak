# -*- coding: utf-8 -*-
import paramiko

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
CREATE TABLE IF NOT EXISTS "WhatsAppShortageRequest" (
    "id" TEXT NOT NULL,
    "chatId" TEXT,
    "groupName" TEXT,
    "senderName" TEXT,
    "senderPhone" TEXT,
    "rawMessage" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "matchedCode" TEXT,
    "activeIngredient" TEXT,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'عبوة',
    "urgency" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'WHATSAPP_GROUP',
    "imageUrl" TEXT,
    "mediaType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppShortageRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WhatsAppShortageRequest_status_idx" ON "WhatsAppShortageRequest"("status");
CREATE INDEX IF NOT EXISTS "WhatsAppShortageRequest_matchedCode_idx" ON "WhatsAppShortageRequest"("matchedCode");
CREATE INDEX IF NOT EXISTS "WhatsAppShortageRequest_productName_idx" ON "WhatsAppShortageRequest"("productName");
ALTER TABLE "WhatsAppShortageRequest" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'WHATSAPP_GROUP';
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql)
stdin.flush()
stdin.channel.shutdown_write()

print("SQL OUT:", stdout.read().decode())
print("SQL ERR:", stderr.read().decode())
c.close()
