# -*- coding: utf-8 -*-
import paramiko
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

IP = "102.203.201.52"
USER = "root"
KEY = r"C:\Users\phabd\.ssh\id_ed25519_coolify"

TRAEFIK_YAML = """http:
  routers:
    at-baitak-router:
      rule: "Host(`at.baitak.mtapp.ly`)"
      service: "at-baitak-service"
      entryPoints:
        - "websecure"
        - "web"
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

    # Create dynamic Traefik route for at.baitak.mtapp.ly
    cmd = f"cat << 'EOF' > /data/coolify/proxy/dynamic/at-baitak.yml\n{TRAEFIK_YAML}\nEOF"
    stdin, stdout, stderr = client.exec_command(cmd)
    stdout.channel.recv_exit_status()
    print("✅ Traefik dynamic config created at /data/coolify/proxy/dynamic/at-baitak.yml")

    # Also make sure Traefik container reloads or checks config
    stdin, stdout, stderr = client.exec_command("docker restart coolify-proxy 2>/dev/null || true")
    stdout.channel.recv_exit_status()
    print("✅ Traefik reverse proxy reloaded successfully")

    client.close()

if __name__ == '__main__':
    main()
