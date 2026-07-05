import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get user prompts from ALL sessions (what users asked for)
print("=== USER PROMPTS ACROSS ALL SESSIONS ===\n")
cur.execute("""
    SELECT m.id, m.session_id, m.agent_id, m.time_created, p.data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created DESC
""")
rows = cur.fetchall()

for mid, sid, agent_id, tc, p_data_str in rows:
    try:
        p = json.loads(p_data_str)
        text = p.get('text', '')
    except:
        continue

    dt = datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M')

    # Get session title
    cur.execute("SELECT title FROM session WHERE id=?", (sid,))
    title_row = cur.fetchone()
    title = title_row[0] if title_row else "unknown"
    title_short = title[:60] + '...' if len(title) > 60 else title

    display = text[:300].replace('\n', ' ')
    print(f"  {dt} | {title_short}")
    print(f"    -> {display}\n")

# Get user queries from history_fts for older sessions
print("\n=== HISTORY FTS ENTRIES ===")
cur.execute("SELECT * FROM history_fts LIMIT 20")
desc = [d[0] for d in cur.description]
rows = cur.fetchall()
for row in rows:
    d = dict(zip(desc, row))
    for k, v in d.items():
        if isinstance(v, str) and len(v) > 10:
            print(f"  {k}: {v[:200]}")
    print()

conn.close()
