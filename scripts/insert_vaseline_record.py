# -*- coding: utf-8 -*-
from PIL import Image
import io
import base64
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

# 1. Crop Vaseline photo from media_1787126998259.png
img_path = r'C:\Users\phabd\.gemini\antigravity-ide\brain\2e8ae5fe-b9b8-45ce-b925-00443456e3a4\.user_uploaded\media_1787126998259.png'
im = Image.open(img_path)
w, h = im.size

# The Vaseline thumbnail in the row
crop_box = (int(w * 0.915), int(h * 0.18), int(w * 0.985), int(h * 0.88))
cropped = im.crop(crop_box).convert('RGB')

buf = io.BytesIO()
cropped.save(buf, format='JPEG', quality=95)
b64_str = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('utf-8')
print(f"Base64 image size: {len(b64_str)} characters")

# 2. Insert into PostgreSQL
k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = f"""
SET client_encoding TO 'UTF8';
INSERT INTO "WhatsAppShortageRequest" (
  id,
  "chatId",
  "groupName",
  "senderName",
  "rawMessage",
  "productName",
  "activeIngredient",
  "matchedCode",
  "requestedQty",
  "unit",
  "urgency",
  "status",
  "mediaType",
  "imageUrl",
  "createdAt",
  "updatedAt"
) VALUES (
  'vaseline-original-2026',
  '120363044711297774@g.us',
  'صيدلية بيتك',
  'صيدلي بيتك',
  'صورة منتج فازلين نقي أصلي Vaseline Original Pure Skin Jelly',
  'Vaseline Original Pure Skin Jelly (فازلين بتروليوم أصلي نقي)',
  'White Petrolatum 100% (بتروليوم نقي مرطب وحامي للجلد)',
  'VAS-ORIG-JELLY',
  NULL,
  'عبوة (مرهم جل)',
  'HIGH',
  'PENDING',
  'IMAGE',
  '{b64_str}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET 
  "productName" = EXCLUDED."productName",
  "activeIngredient" = EXCLUDED."activeIngredient",
  "matchedCode" = EXCLUDED."matchedCode",
  "imageUrl" = EXCLUDED."imageUrl";
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()

print("INSERT VASELINE RESULT:\n", stdout.read().decode('utf-8', errors='replace'))
c.close()
