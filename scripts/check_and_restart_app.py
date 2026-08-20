# -*- coding: utf-8 -*-
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

k = r'C:\Users\phabd\.ssh\id_ed25519_coolify'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('102.203.201.52', username='root', key_filename=k)

# اكتشف docker-compose.yml
_, out, _ = c.exec_command('cd /opt/at.baitak && cat docker-compose.yml')
print('=== docker-compose.yml ===')
print(out.read().decode('utf-8', errors='replace'))

# اكتشف الحاويات الشغالة
_, out, _ = c.exec_command('docker ps --format "{{.Names}}"')
print('\n=== Running Containers ===')
print(out.read().decode('utf-8', errors='replace'))

# إعادة تشغيل التطبيق بدون تحديد اسم الخدمة
_, out, err = c.exec_command('cd /opt/at.baitak && docker compose up -d --build')
print('\n=== Docker Compose Restart ===')
print(out.read().decode('utf-8', errors='replace'))
err_txt = err.read().decode('utf-8', errors='replace')
if err_txt: print('ERR:', err_txt)

c.close()
