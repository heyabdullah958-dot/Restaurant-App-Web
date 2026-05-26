import sys
import os

# Check if psycopg2 is installed
try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 is not installed in the current Python environment.")
    print("Please run this script using the backend virtual environment python:")
    print("backend\\venv\\Scripts\\python.exe db_tester.py")
    sys.exit(1)

print("=============================================")
print("   FoodSphere Supabase Database Verifier     ")
print("=============================================")

project_id = "ndvazawbvyeasmsxlbrz"

# Prompt user for password
try:
    password = input("Please enter your Supabase Database Password: ").strip()
except KeyboardInterrupt:
    print("\nCancelled.")
    sys.exit(1)

if not password:
    print("Error: Password cannot be empty.")
    sys.exit(1)

# Escape special characters for URI if needed (urllib.parse.quote)
from urllib.parse import quote_plus
escaped_password = quote_plus(password)

# Option A: Transaction Pooler
pooler_url = f"postgresql://postgres.{project_id}:{escaped_password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"

# Option B: Direct Connection
direct_url = f"postgresql://postgres:{escaped_password}@db.{project_id}.supabase.co:5432/postgres"

success = False

print("\n[1] Testing Option A (Transaction Pooler - Port 6543)...")
try:
    conn = psycopg2.connect(pooler_url, connect_timeout=5)
    conn.close()
    print("✅ SUCCESS: Connection verified using Transaction Pooler!")
    print("\nCopy this EXACT value for DATABASE_URL in Render:")
    print("-" * 80)
    print(pooler_url)
    print("-" * 80)
    success = True
except Exception as e:
    print(f"❌ Option A Failed: {e}")

if not success:
    print("\n[2] Testing Option B (Direct Connection - Port 5432)...")
    try:
        conn = psycopg2.connect(direct_url, connect_timeout=5)
        conn.close()
        print("✅ SUCCESS: Connection verified using Direct Connection!")
        print("\nCopy this EXACT value for DATABASE_URL in Render:")
        print("-" * 80)
        print(direct_url)
        print("-" * 80)
        success = True
    except Exception as e:
        print(f"❌ Option B Failed: {e}")

if not success:
    print("\n" + "!" * 50)
    print("❌ BOTH CONNECTIONS FAILED.")
    print("This means the password you entered is incorrect, or Supabase is still setting up.")
    print("Please double check your password, or reset it in Supabase settings and try again.")
    print("!" * 50)
