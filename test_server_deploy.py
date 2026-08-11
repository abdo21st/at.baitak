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
                print(f"✅ Successful SSH Key connection to {IP} using {k}")
                return client
            except Exception as e:
                print(f"Key attempt {k} failed: {e}")
    return None

def main():
    client = connect()
    if not client:
        print("❌ Could not connect via SSH Key")
        return

    # Check containers
    stdin, stdout, stderr = client.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
    print("\n--- Running Docker Containers on Server ---")
    print(stdout.read().decode('utf-8'))

    # Deploying or updating app directly on server
    print("\n--- Deploying at.baitak.mtapp.ly on server with Persistent PostgreSQL ---")
    deploy_cmds = [
        "mkdir -p /opt/at.baitak",
        "cd /opt/at.baitak && if [ -d .git ]; then git pull origin main; else git clone https://github.com/abdo21st/at.baitak.git .; fi",
        "cd /opt/at.baitak && docker compose up -d --build",
        "docker exec hodoork_app npx prisma@5.22.0 db push"
    ]

    for cmd in deploy_cmds:
        print(f"\n[Exec]: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out:
            print(out)
        if err:
            print(err)

    client.close()

if __name__ == '__main__':
    main()
