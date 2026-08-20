# -*- coding: utf-8 -*-
"""
fix_waha_env_server.py
يضيف WAHA_API_KEY و WAHA_API_URL و N8N_WEBHOOK_URL إلى .env على السيرفر
ويعيد بناء الحاوية لتفعيل الإرسال الفعلي لرسائل واتساب
"""
import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

IP   = "102.203.201.52"
USER = "root"
KEYS = [
    r"C:\Users\phabd\.ssh\id_ed25519",
    r"C:\Users\phabd\.ssh\id_ed25519_coolify"
]
APP_DIR = "/opt/at.baitak"
ENV_FILE = f"{APP_DIR}/.env"

# المتغيرات المطلوب إضافتها
NEW_VARS = {
    "WAHA_API_URL":    "http://102.203.201.52:3008/api/sendText",
    "WAHA_API_KEY":    "hodoork_waha_secure_2026",
    "N8N_WEBHOOK_URL": "http://102.203.201.52:5678/webhook/attendance-alert",
}

def connect():
    for k in KEYS:
        if os.path.exists(k):
            try:
                c = paramiko.SSHClient()
                c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                c.connect(IP, port=22, username=USER, key_filename=k, timeout=15)
                print(f"✅ اتصال ناجح عبر: {k}")
                return c
            except Exception as e:
                print(f"   محاولة {k}: {e}")
    return None

def run(client, title, cmd):
    print(f"\n🚀 [{title}]")
    _, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err and 'warning' not in err.lower() and 'notice' not in err.lower():
        print("⚠️ Err:", err)
    return out

def main():
    client = connect()
    if not client:
        print("❌ فشل الاتصال")
        return

    # 1. قراءة .env الحالي
    existing = run(client, "قراءة .env الحالي", f"cat {ENV_FILE}")
    existing_lines = existing.splitlines()
    existing_keys = {ln.split('=')[0].strip() for ln in existing_lines if '=' in ln and not ln.startswith('#')}

    # 2. تحديد المتغيرات الناقصة فقط
    to_add = {k: v for k, v in NEW_VARS.items() if k not in existing_keys}

    if not to_add:
        print("\n✅ جميع متغيرات WAHA وn8n موجودة بالفعل في .env السيرفر")
    else:
        print(f"\n📝 سيتم إضافة {len(to_add)} متغير ناقص: {list(to_add.keys())}")
        append_block = "\n\n# ─── WAHA WhatsApp API + n8n (auto-added) ───\n"
        for k, v in to_add.items():
            append_block += f'{k}="{v}"\n'

        # كتابة الإضافة بشكل آمن
        safe_block = append_block.replace("'", "'\\''")
        run(client, "إضافة المتغيرات الناقصة", f"echo '{safe_block}' >> {ENV_FILE}")
        run(client, "التحقق من .env بعد التعديل", f"tail -10 {ENV_FILE}")

    # 3. إعادة بناء الحاوية بدون downtime
    run(client, "إعادة بناء وتشغيل الحاوية", f"cd {APP_DIR} && docker compose up -d --build --no-deps hodoork_app")

    # 4. التحقق من اتصال WAHA
    waha_check = run(client, "فحص حالة WAHA API", "curl -s -o /dev/null -w '%{http_code}' http://102.203.201.52:3008/api/version -H 'X-Api-Key: hodoork_waha_secure_2026'")
    if waha_check == '200':
        print("\n✅ WAHA يستجيب بشكل صحيح (HTTP 200)")
    else:
        print(f"\n⚠️ WAHA أعاد HTTP {waha_check} — تحقق من حالة الحاوية")

    # 5. فحص جلسة WAHA (هل الواتساب مرتبط؟)
    session_check = run(client, "فحص جلسة الواتساب", "curl -s http://102.203.201.52:3008/api/sessions -H 'X-Api-Key: hodoork_waha_secure_2026'")
    print(f"\n📱 حالة جلسة WAHA:\n{session_check}")

    print("\n✅ تم إصلاح متغيرات WAHA وإعادة تشغيل السيرفر بنجاح!")
    client.close()

if __name__ == '__main__':
    main()
