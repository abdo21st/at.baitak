# -*- coding: utf-8 -*-
import paramiko
import json
import base64
import os
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

sql = """
SET client_encoding TO 'UTF8';
SELECT json_agg(t) FROM (
  SELECT id, "productName", "rawMessage", "activeIngredient", "imageUrl", "createdAt" 
  FROM "WhatsAppShortageRequest" 
  ORDER BY "createdAt" DESC 
  LIMIT 5
) t;
"""

stdin, stdout, stderr = c.exec_command('docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -t')
stdin.write(sql.encode('utf-8'))
stdin.flush()
stdin.channel.shutdown_write()

res = stdout.read().decode('utf-8', errors='replace').strip()
if res.startswith('SET'):
    res = res.split('\n', 1)[1].strip()
try:
    items = json.loads(res)
    print(f"Total items returned: {len(items)}")
    for idx, it in enumerate(items):
        img_len = len(it.get('imageUrl') or '')
        print(f"[{idx+1}] ID: {it.get('id')} | Name: {it.get('productName')} | Img: {img_len} chars | Date: {it.get('createdAt')}")
        if idx == 0 and it.get('imageUrl'):
            img_url = it['imageUrl']
            if 'base64,' in img_url:
                b64 = img_url.split('base64,')[1]
                data = base64.b64decode(b64)
                out_path = r'I:\at\public\uploads\latest_whatsapp_product.jpg'
                with open(out_path, 'wb') as f:
                    f.write(data)
                print(f"Saved latest image to: {out_path} ({len(data)} bytes)")
except Exception as e:
    print("Error parsing json:", e)
    print("Raw:", res[:300])

c.close()
