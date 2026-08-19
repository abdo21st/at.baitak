# -*- coding: utf-8 -*-
import paramiko
import base64
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
COPY (
  SELECT id || '|||' || "productName" || '|||' || COALESCE("imageUrl", '')
  FROM "WhatsAppShortageRequest" 
  WHERE "productName" LIKE '%مستخرج%'
  LIMIT 1
) TO STDOUT;
"""

stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
res = stdout.read().decode('utf-8', errors='replace').strip()

parts = res.split('|||')
if len(parts) >= 3:
    rec_id, name, img = parts[0], parts[1], parts[2]
    print(f"ID: {rec_id}")
    print(f"Name: {name}")
    print(f"Img len: {len(img)}")
    if 'base64,' in img:
        b64 = img.split('base64,')[1].strip()
        data = base64.b64decode(b64)
        out_path = r'I:\at\public\uploads\blue_bottle_photo.jpg'
        with open(out_path, 'wb') as f:
            f.write(data)
        print(f"Saved blue bottle photo to: {out_path} ({len(data)} bytes)")
else:
    print("No row found matching '%مستخرج%'")

c.close()
