# -*- coding: utf-8 -*-
import paramiko
import base64
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
COPY (
  SELECT "imageUrl"
  FROM "WhatsAppShortageRequest" 
  WHERE "imageUrl" IS NOT NULL
  ORDER BY "createdAt" DESC 
  LIMIT 1
) TO STDOUT;
"""

stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
img_str = stdout.read().decode('utf-8', errors='replace').strip()

print(f"Image string length: {len(img_str)}")
if 'base64,' in img_str:
    b64 = img_str.split('base64,')[1].strip()
    img_data = base64.b64decode(b64)
    import os
    out_file = r'I:\at\public\uploads\latest_whatsapp_photo_raw.jpg'
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, 'wb') as f:
        f.write(img_data)
    print(f"✅ Successfully saved {len(img_data)} bytes to {out_file}")

c.close()
