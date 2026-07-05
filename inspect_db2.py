import sqlite3
import json

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get column names for key tables
for t in ['session', 'message', 'part', 'project']:
    cur.execute(f"PRAGMA table_info([{t}])")
    cols = [(r[1], r[2]) for r in cur.fetchall()]
    print(f"\n=== {t} columns ===")
    for name, typ in cols:
        print(f"  {name} ({typ})")

# List sessions
print("\n=== SESSIONS ===")
cur.execute("SELECT * FROM session ORDER BY rowid DESC LIMIT 20")
desc = [d[0] for d in cur.description]
rows = cur.fetchall()
for row in rows:
    d = dict(zip(desc, row))
    print(f"  id={d.get('id','?')} | created={d.get('time_created','?')} | title={d.get('title','?')}")

# List projects
print("\n=== PROJECTS ===")
cur.execute("SELECT * FROM project")
desc = [d[0] for d in cur.description]
rows = cur.fetchall()
for row in rows:
    d = dict(zip(desc, row))
    print(f"  id={d.get('id','?')} | path={d.get('path','?')} | name={d.get('name','?')}")

conn.close()
