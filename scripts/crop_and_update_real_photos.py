# -*- coding: utf-8 -*-
from PIL import Image
import os
import io
import base64
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

img_path = r"C:\Users\phabd\.gemini\antigravity-ide\brain\2e8ae5fe-b9b8-45ce-b925-00443456e3a4\.user_uploaded\media_1787125229780.png"

if not os.path.exists(img_path):
    print(f"File not found: {img_path}")
    sys.exit(1)

full_img = Image.open(img_path)
width, height = full_img.size
print(f"Full Screenshot Dimensions: {width} x {height}")

# Precise pixel coordinates in 1024x550 screenshot:
# Image 1 (Arabic box side - top photo):
box1 = (37, 137, 166, 318)

# Image 2 (English box side - bottom photo):
box2 = (37, 321, 166, 502)

crop1 = full_img.crop(box1)
crop2 = full_img.crop(box2)

# Save cropped images locally to verify
out1_path = r"I:\at\scripts\real_baby_rest_ar.jpg"
out2_path = r"I:\at\scripts\real_baby_rest_en.jpg"

crop1.convert('RGB').save(out1_path, 'JPEG', quality=95)
crop2.convert('RGB').save(out2_path, 'JPEG', quality=95)

print(f"Saved real photo 1 to {out1_path} ({crop1.size})")
print(f"Saved real photo 2 to {out2_path} ({crop2.size})")

# Convert to Base64
buf1 = io.BytesIO()
crop1.convert('RGB').save(buf1, format='JPEG', quality=95)
b64_1 = f"data:image/jpeg;base64,{base64.b64encode(buf1.getvalue()).decode('utf-8')}"

buf2 = io.BytesIO()
crop2.convert('RGB').save(buf2, format='JPEG', quality=95)
b64_2 = f"data:image/jpeg;base64,{base64.b64encode(buf2.getvalue()).decode('utf-8')}"

# Update live PostgreSQL database on 102.203.201.52
k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# 1. Clean previous records
stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'DELETE FROM "WhatsAppShortageRequest";\'')
print("Cleaned:", stdout.read().decode())

# 2. Insert Arabic Real Photo Record
sql1 = f"""
SET client_encoding TO 'UTF8';
INSERT INTO "WhatsAppShortageRequest" (
    id, "chatId", "groupName", "senderName", "senderPhone",
    "rawMessage", "productName", "matchedCode", "activeIngredient",
    "requestedQty", unit, urgency, status, source, "imageUrl", "mediaType", notes, "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    '120363422055627258@g.us',
    'صيدلية بيتك',
    'عبدالرحمن (صيدلية بيتك)',
    '218923458014',
    'نجرب في برنامج😅 - صورة علبة بيبي ريست قطرات للرضع 15 مل',
    'بيبي ريست قطرات للرضع 15 مل (Baby Rest)',
    'WA-BABYREST-AR',
    'Simethicone (سيميثيكون مضاد للانتفاخ والغازات للرضع والأطفال)',
    10,
    'عبوة',
    'HIGH',
    'PENDING',
    'WHATSAPP_GROUP',
    '{b64_1}',
    'IMAGE',
    'الصورة الحقيقية المستلمة من مجموعة صيدلية بيتك 📸',
    NOW(),
    NOW()
);
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql1.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()
print("SQL 1 Result:", stdout.read().decode('utf-8', errors='replace').strip())

# 3. Insert English Real Photo Record
sql2 = f"""
SET client_encoding TO 'UTF8';
INSERT INTO "WhatsAppShortageRequest" (
    id, "chatId", "groupName", "senderName", "senderPhone",
    "rawMessage", "productName", "matchedCode", "activeIngredient",
    "requestedQty", unit, urgency, status, source, "imageUrl", "mediaType", notes, "createdAt", "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    '120363422055627258@g.us',
    'صيدلية بيتك',
    'عبدالرحمن (صيدلية بيتك)',
    '218923458014',
    'BABY REST ORAL DROPS 15ml - Antiflatulent Oral Drops',
    'BABY REST ORAL DROPS 15ml',
    'WA-BABYREST-EN',
    'Simethicone (Antiflatulent Drops)',
    10,
    'عبوة',
    'HIGH',
    'PENDING',
    'WHATSAPP_GROUP',
    '{b64_2}',
    'IMAGE',
    'الصورة الحقيقية المستلمة من مجموعة صيدلية بيتك 📸',
    NOW(),
    NOW()
);
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
stdin.write(sql2.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()
print("SQL 2 Result:", stdout.read().decode('utf-8', errors='replace').strip())

c.close()
print("✅ تم بنجاح نقل وحفظ الصورتين الحقيقيتين في قاعدة البيانات!")
