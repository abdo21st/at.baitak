# -*- coding: utf-8 -*-
import paramiko
import json
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# Query recent records
sql = 'SELECT id, "productName", "rawMessage", "imageUrl", "createdAt" FROM "WhatsAppShortageRequest" ORDER BY "createdAt" DESC LIMIT 5;'
stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -t -A -F"|||" -c \'{sql}\'')
rows = stdout.read().decode('utf-8', errors='replace').strip().split('\n')

print(f"Total rows retrieved: {len(rows)}")
for idx, r in enumerate(rows):
    parts = r.split('|||')
    if len(parts) >= 4:
        row_id, p_name, raw_msg, img_data = parts[0], parts[1], parts[2], parts[3]
        print(f"Row {idx+1}: ID={row_id} | Name={p_name} | Raw={raw_msg[:50]} | ImgLen={len(img_data)}")
        if img_data and img_data.startswith('data:image'):
            # Save image locally
            b64_clean = img_data.split('base64,')[1] if 'base64,' in img_data else img_data
            try:
                img_bytes = base64.b64decode(b64_clean)
                out_path = rf"I:\at\scripts\downloaded_whatsapp_image_{idx+1}.jpg"
                with open(out_path, 'wb') as f:
                    f.write(img_bytes)
                print(f"   ↳ Saved to {out_path} ({len(img_bytes)} bytes)")
            except Exception as e:
                print(f"   ↳ Base64 decode err: {e}")

c.close()
