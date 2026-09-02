"""
DEAD AIR Event Platform — Database Seeding Script
Executes seed SQL commands against Supabase PostgreSQL.
"""

import os
import sys
import hashlib
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY"))

def compute_hashes():
    """Prints pre-computed SHA-256 hashes for reference."""
    print("=== Challenge Answer Hashes (SHA-256) ===")
    answers = [
        ("frequency", "harbor_lights"),
        ("static", "nightshade_1984"),
        ("script", "dead_air_silence"),
        ("frame", "transmitter_vault_b"),
        ("echo", "project_oblivion"),
    ]
    for slug, ans in answers:
        h = hashlib.sha256(ans.encode()).hexdigest()
        print(f"[{slug}] '{ans}' -> {h}")

    print("\n=== Default Passwords ===")
    print("Admin 'DeadAir2026!' ->", hashlib.sha256("DeadAir2026!".encode()).hexdigest())
    print("Team 'playdeadair' ->", hashlib.sha256("playdeadair".encode()).hexdigest())

def main():
    compute_hashes()
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\nNote: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.")
        print("When deploying to Supabase, run the SQL migrations in `supabase/migrations/` and `supabase/seed.sql` inside the Supabase SQL Editor.")
        return

    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("\nConnected to Supabase. Checking tables...")
        res = client.table("challenges").select("slug, title").execute()
        print("Active challenges in DB:", res.data)
    except Exception as e:
        print("Supabase connection check failed:", e)

if __name__ == "__main__":
    main()
