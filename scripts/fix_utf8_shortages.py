# -*- coding: utf-8 -*-
import urllib.request
import base64
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

api_key = 'hodoork_waha_secure_2026'

# 1. Clean previous test question mark records
clean_sql = 'DELETE FROM "WhatsAppShortageRequest";'
stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{clean_sql}\'')
print("Cleaned:", stdout.read().decode())

# 2. Re-insert both Baby Rest photos with UTF-8 encoding
images = [
    {
        "filename": "AC45E0688391185D8D9E385184C6BBE8.jpeg",
        "productName": "بيبي ريست قطرات للرضع 15 مل (Baby Rest)",
        "caption": "نجرب في برنامج😅 - صورة علبة بيبي ريست",
        "activeIngredient": "Simethicone (سيميثيكون مضاد للانتفاخ والغازات)",
        "requestedQty": 10,
        "unit": "عبوة",
        "urgency": "HIGH"
    },
    {
        "filename": "ACC9F301CDA6082A3ED8CED42126BDFA.jpeg",
        "productName": "BABY REST ORAL DROPS 15ml (قطرات فموية)",
        "caption": "صورة العلبة باللغة الإنجليزية - Baby Rest Oral Drops",
        "activeIngredient": "Simethicone",
        "requestedQty": 10,
        "unit": "عبوة",
        "urgency": "HIGH"
    }
]

for img in images:
    url = f"http://102.203.201.52:3008/api/files/default/{img['filename']}"
    req = urllib.request.Request(url, headers={'X-Api-Key': api_key})
    try:
        with urllib.request.urlopen(req) as resp:
            raw_bytes = resp.read()
            b64_str = f"data:image/jpeg;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"
            
            # Use docker exec with client_encoding=UTF8
            sql = f"""
            SET client_encoding TO 'UTF8';
            INSERT INTO "WhatsAppShortageRequest" (
                id, "chatId", "groupName", "senderName", "senderPhone",
                "rawMessage", "productName", "matchedCode", "activeIngredient",
                "requestedQty", unit, urgency, status, source, "imageUrl", "mediaType", notes, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text,
                '120363422055627258@g.us',
                'صيدلية بيتك',
                'د. أحمد (صيدلية بيتك)',
                '218923458014',
                '{img["caption"]}',
                '{img["productName"]}',
                'WA-BABYREST',
                '{img["activeIngredient"]}',
                {img["requestedQty"]},
                '{img["unit"]}',
                '{img["urgency"]}',
                'PENDING',
                'WHATSAPP_GROUP',
                '{b64_str}',
                'IMAGE',
                'تم استلام الصورة من مجموعة صيدلية بيتك بنجاح 📸',
                NOW(),
                NOW()
            );
            """
            
            stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db')
            stdin.write(sql.encode('utf-8'))
            stdin.flush()
            stdin.channel.shutdown_write()
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            print(f"Inserted UTF-8 {img['productName']}: {out.strip()} {err.strip()}")
    except Exception as e:
        print(f"Err on {img['filename']}: {e}")

c.close()
