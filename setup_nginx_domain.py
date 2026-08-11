# -*- coding: utf-8 -*-
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

IP = "102.203.201.52"
USER = "root"
KEY = r"C:\Users\phabd\.ssh\id_ed25519_coolify"

NGINX_CONF = """server {
    listen 80;
    server_name at.baitak.mtapp.ly;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(IP, port=22, username=USER, key_filename=KEY, timeout=15)
    print("✅ Connected to server via SSH")

    # 1. Write Nginx server block for at.baitak.mtapp.ly
    cmd_write = f"cat << 'EOF' > /etc/nginx/sites-available/at.baitak.mtapp.ly\n{NGINX_CONF}\nEOF"
    client.exec_command(cmd_write)
    print("✅ Created Nginx configuration at /etc/nginx/sites-available/at.baitak.mtapp.ly")

    # 2. Enable symlink in sites-enabled
    cmd_link = "ln -sf /etc/nginx/sites-available/at.baitak.mtapp.ly /etc/nginx/sites-enabled/"
    client.exec_command(cmd_link)
    print("✅ Enabled site symlink")

    # 3. Test nginx config & reload
    stdin, stdout, stderr = client.exec_command("nginx -t && systemctl reload nginx")
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print(f"✅ Nginx reloaded successfully: {out} {err}")

    # 4. Attempt certbot SSL generation if certbot is installed
    stdin, stdout, stderr = client.exec_command("certbot --nginx -d at.baitak.mtapp.ly --non-interactive --agree-tos -m admin@baitak.mtapp.ly 2>&1")
    cert_out = stdout.read().decode('utf-8')
    print(f"🔒 Certbot SSL status:\n{cert_out}")

    client.close()

if __name__ == '__main__':
    main()
