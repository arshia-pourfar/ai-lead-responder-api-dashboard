import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get all sessions with their timestamps
cur.execute("SELECT id, title, time_created FROM session ORDER BY time_created DESC")
sessions = cur.fetchall()

print("=== ALL SESSIONS (sorted by time) ===")
for sid, title, tc in sessions:
    dt = datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M')
    t = (title[:80] + '...') if len(title or '') > 80 else title
    print(f"  {dt} | {sid} | {t}")

# Get messages per session
print("\n=== MESSAGES PER SESSION ===")
cur.execute("""
    SELECT s.id, s.title, COUNT(m.id) as msg_count
    FROM session s
    LEFT JOIN message m ON m.session_id = s.id
    GROUP BY s.id
    ORDER BY s.time_created DESC
""")
for sid, title, cnt in cur.fetchall():
    t = (title[:60] + '...') if len(title or '') > 60 else title
    print(f"  {sid} | msgs={cnt} | {t}")

# Get tool usage patterns from parts
print("\n=== TOOL USAGE PATTERNS (assistant turns) ===")
cur.execute("""
    SELECT json_extract(p.data, '$.tool') as tool,
           substr(json_extract(p.data, '$.state.input'), 1, 150) as input_preview,
           count(*) as n
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'tool'
    GROUP BY tool, input_preview
    ORDER BY n DESC
    LIMIT 40
""")
for tool, inp, n in cur.fetchall():
    if tool:
        print(f"  {n}x | {tool} | {(inp or '')[:100]}")

conn.close()
