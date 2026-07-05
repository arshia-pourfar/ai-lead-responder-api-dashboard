import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check ALL messages (including subagent)
cur.execute("""
    SELECT m.id, m.session_id, m.agent_id, m.data, m.time_created
    FROM message m
    ORDER BY m.time_created DESC
    LIMIT 60
""")
rows = cur.fetchall()

print("=== ALL MESSAGES (last 60) ===")
for mid, sid, agent_id, data_str, tc in rows:
    try:
        msg = json.loads(data_str) if data_str else {}
    except:
        msg = {}
    role = msg.get('role', '?')
    dt = datetime.fromtimestamp(tc / 1000).strftime('%m-%d %H:%M')
    agent = agent_id or 'main'

    # Get text preview
    cur.execute("SELECT data FROM part WHERE message_id=?", (mid,))
    parts = cur.fetchall()
    text_preview = ""
    tool_preview = ""
    for p_str in parts:
        try:
            p = json.loads(p_str)
            if p.get('type') == 'text' and p.get('text'):
                text_preview = p['text'][:120].replace('\n', ' ')
            elif p.get('type') == 'tool':
                tool = p.get('tool', '?')
                state = p.get('state', {})
                inp = str(state.get('input', ''))[:80]
                tool_preview = f"[tool:{tool}] {inp}"
        except:
            pass

    preview = text_preview or tool_preview or "(no content)"
    agent_label = f" [agent:{agent[:20]}]" if agent_id else ""
    print(f"  {dt} | {role:10s}{agent_label:25s} | sid={sid[-12:]} | {preview[:120]}")

conn.close()
