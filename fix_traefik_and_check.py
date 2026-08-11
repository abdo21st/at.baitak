# -*- coding: utf-8 -*-
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

IP = "102.203.201.52"
USER = "root"
KEY = r"C:\Users\phabd\.ssh\id_ed25519_coolify"

TRAEFIK_YAML = """http:
  routers:
    at-baitak-http:
      rule: "Host(`at.baitak.mtapp.ly`)"
      service: "at-baitak-service"
      entryPoints:
        - "web"

    at-baitak-https:
      rule: "Host(`at.baitak.mtapp.ly`)"
      service: "at-baitak-service"
      entryPoints:
        - "websecure"
      tls:
        certResolver: "letsencrypt"

  services:
    at-baitak-service:
      loadBalancer:
        servers:
          - url: "http://102.203.201.52:3005"
"""

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(IP, port=22, username=USER, key_filename=KEY, timeout=15)
    print("✅ Connected to server via SSH")

    # Update Traefik dynamic config
    cmd_write = f"cat << 'EOF' > /data/coolify/proxy/dynamic/at-baitak.yml\n{TRAEFIK_YAML}\nEOF"
    client.exec_command(cmd_write)
    print("✅ Dynamic Traefik config written to /data/coolify/proxy/dynamic/at-baitak.yml")

    # Check Traefik logs
    stdin, stdout, stderr = client.exec_command("docker logs coolify-proxy --tail 20 2>&1")
    logs = stdout.read().decode('utf-8')
    print("\n--- Traefik Proxy Logs ---")
    print(logs)

    # Test local curl
    stdin, stdout, stderr = client.exec_command("curl -I http://127.0.0.1:3005/login")
    curl_res = stdout.read().decode('utf-8')
    print("\n--- Direct Container Response (Port 3005) ---")
    print(curl_res)

    client.close()

if __name__ == '__main__':
    main()
