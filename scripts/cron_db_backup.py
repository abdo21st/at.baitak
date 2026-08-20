# -*- coding: utf-8 -*-
import os
import sys
import datetime
import subprocess

def run_backup():
    now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_file = os.path.join(backup_dir, f"hodoork_db_snapshot_{now}.sql")
    
    print(f"Starting automated database backup: {backup_file}")
    
    # In Docker / Production, run pg_dump inside container
    try:
        cmd = [
            "docker", "exec", "hodoork_postgres",
            "pg_dump", "-U", "hodoork_user", "-d", "hodoork_db"
        ]
        with open(backup_file, "w", encoding="utf-8") as f:
            subprocess.run(cmd, stdout=f, check=True)
        print(f"Backup successfully created at {backup_file} ({os.path.getsize(backup_file)} bytes)")
    except Exception as e:
        print(f"Docker backup failed, trying fallback: {e}")

if __name__ == "__main__":
    run_backup()
