import sqlite3
import json

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 1. List tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("=== TABLES ===")
print(tables)

# 2. Count sessions
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM [{t}]")
    print(f"  {t}: {cur.fetchone()[0]} rows")

# 3. List sessions
print("\n=== SESSIONS ===")
try:
    cur.execute("SELECT id, data, time_created FROM session ORDER BY time_created DESC LIMIT 20")
    rows = cur.fetchall()
    for sid, data_str, tc in rows:
        try:
            d = json.loads(data_str) if data_str else {}
        except:
            d = {}
        print(f"  {sid} | created={tc} | title={d.get('title','?')}")
except Exception as e:
    print(f"  Error: {e}")

conn.close()
