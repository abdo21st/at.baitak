# -*- coding: utf-8 -*-
import paramiko
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# Read the Panadol image
panadol_img_path = r"I:\at\scripts\downloaded_whatsapp_image_1.jpg"
with open(panadol_img_path, 'rb') as f:
    panadol_b64 = f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"

# Update row 1 (ID: cf9d21f2-6df1-4308-9862-99a7e8678a14) or insert clean
sql = f"""
SET client_encoding TO 'UTF8';
UPDATE "WhatsAppShortageRequest"
SET 
    "productName" = 'Panadol ActiFast 500mg 20 Tablets (بانادول أكتيفاست)',
    "matchedCode" = 'PAN-ACT-500',
    "activeIngredient" = 'Paracetamol 500mg (Analgesic & Antipyretic - مسكن آلام وخافض حرارة سريع المفعول)',
    "requestedQty" = 10,
    "unit" = 'عبوة (20 قرص)',
    "urgency" = 'HIGH',
    "rawMessage" = 'صورة علبة دواء: Panadol ActiFast 500mg - GSK (20 tablets)',
    "notes" = 'مسكن آلام وخافض حرارة سريع المفعول مدعم بالصوديوم بيكربونات لتسريع الامتصاص • لطيف على المعدة • 🇬🇧 BNF 83 p.462',
    "imageUrl" = '{panadol_b64}',
    "updatedAt" = NOW()
WHERE "id" = 'cf9d21f2-6df1-4308-9862-99a7e8678a14' OR "productName" LIKE '%صورة دواء مرفقة%';
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()

print("UPDATE RESULT:", stdout.read().decode('utf-8', errors='replace').strip())
print("ERR:", stderr.read().decode('utf-8', errors='replace').strip())

c.close()
