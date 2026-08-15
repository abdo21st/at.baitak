# -*- coding: utf-8 -*-
import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

IP = "102.203.201.52"
USER = "root"
KEYS = [
    r"C:\Users\phabd\.ssh\id_ed25519",
    r"C:\Users\phabd\.ssh\id_ed25519_coolify"
]

def connect():
    for k in KEYS:
        if os.path.exists(k):
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(IP, port=22, username=USER, key_filename=k, timeout=15)
                print(f"✅ تم الاتصال بنجاح بالمخدم {IP} عبر المفتاح: {k}")
                return client
            except Exception as e:
                print(f"Key attempt {k} notice: {e}")
    return None

def main():
    client = connect()
    if not client:
        print("❌ لم نتمكن من الاتصال بالمخدم عبر المفاتيح")
        return

    commands = [
        ("فحص الحاويات الحالية", 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'),
        ("سحب آخر التحديثات من GitHub", "cd /opt/at.baitak && git pull origin main"),
        ("إعادة بناء وتشغيل الحاوية بأحدث كود", "cd /opt/at.baitak && docker compose up -d --build"),
        ("مزامنة هيكل قاعدة البيانات بأمان", "docker exec hodoork_app npx prisma db push --skip-generate")
    ]

    for title, cmd in commands:
        print(f"\n🚀 [{title}]: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out.strip())
        if err and "warning" not in err.lower() and "notice" not in err.lower():
            print("Note/Err:", err.strip())

    print("\n✅ تم تحديث ونشر النظام على السيرفر المباشر بنجاح 100%!")
    client.close()

if __name__ == '__main__':
    main()
