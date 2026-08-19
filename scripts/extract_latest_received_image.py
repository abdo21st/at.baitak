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
  SELECT id || '|||' || "productName" || '|||' || COALESCE("activeIngredient", '') || '|||' || COALESCE("imageUrl", '')
  FROM "WhatsAppShortageRequest" 
  ORDER BY "createdAt" DESC 
  LIMIT 1
) TO STDOUT;
"""

stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
line = stdout.read().decode('utf-8', errors='replace').strip()

parts = line.split('|||')
if len(parts) >= 4:
    rec_id, prod_name, act_ing, img_url = parts[0], parts[1], parts[2], parts[3]
    print(f"ID: {rec_id}")
    print(f"Name: {prod_name}")
    print(f"Active: {act_ing}")
    print(f"Img len: {len(img_url)}")
    
    if img_url.startswith('data:image'):
        header, b64 = img_url.split(',', 1)
        data = base64.b64decode(b64)
        out_path = r'I:\at\public\uploads\latest_whatsapp_product.jpg'
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        with open(out_path, 'wb') as f:
            f.write(data)
        print(f"✅ SAVED IMAGE TO: {out_path} ({len(data)} bytes)")

c.close()
