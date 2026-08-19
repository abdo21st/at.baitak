# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# Update database to allow NULL quantities and set current records without explicit quantity to NULL
sql = """
ALTER TABLE "WhatsAppShortageRequest" ALTER COLUMN "requestedQty" DROP NOT NULL;
ALTER TABLE "WhatsAppShortageRequest" ALTER COLUMN "requestedQty" DROP DEFAULT;
UPDATE "WhatsAppShortageRequest" SET "requestedQty" = NULL;
"""

stdin, stdout, stderr = c.exec_command(f'docker exec -i hodoork_postgres psql -U postgres -d hodoork_db -c \'{sql}\'')
print("DB UPDATE RESULT:\n", stdout.read().decode())
print("ERR:\n", stderr.read().decode())

c.close()
print("✅ تم تعديل العمود وتفريغ خانة الكمية بنجاح ليقوم مسؤول المشتريات بإدخالها!")
