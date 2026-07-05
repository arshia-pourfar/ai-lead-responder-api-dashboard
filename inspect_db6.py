import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check raw message data for a few messages
cur.execute("""
    SELECT id, session_id, agent_id, data, time_created
    FROM message
    ORDER BY time_created DESC
    LIMIT 10
""")
rows = cur.fetchall()

for mid, sid, agent_id, data_str, tc in rows:
    dt = datetime.fromtimestamp(tc / 1000).strftime('%m-%d %H:%M')
    print(f"\n--- Message {mid} ({dt}) ---")
    print(f"  session: {sid}, agent: {agent_id or 'main'}")
    if data_str:
        try:
            d = json.loads(data_str)
            print(f"  data keys: {list(d.keys())}")
            print(f"  role: {d.get('role')}")
            if 'content' in d:
                content = d['content']
                if isinstance(content, str):
                    print(f"  content (str): {content[:200]}")
                elif isinstance(content, list):
                    print(f"  content (list, len={len(content)}):")
                    for item in content[:3]:
                        if isinstance(item, dict):
                            print(f"    type={item.get('type')}, text={str(item.get('text',''))[:100]}")
        except Exception as e:
            print(f"  parse error: {e}")
            print(f"  raw: {data_str[:300]}")
    else:
        print("  data: None/empty")

    # Check parts
    cur.execute("SELECT data FROM part WHERE message_id=?", (mid,))
    parts = cur.fetchall()
    if parts:
        print(f"  parts: {len(parts)}")
        for p_str in parts[:2]:
            try:
                p = json.loads(p_str)
                print(f"    part type={p.get('type')}, keys={list(p.keys())}")
                if p.get('type') == 'text':
                    print(f"    text: {p.get('text','')[:150]}")
                elif p.get('type') == 'tool':
                    print(f"    tool: {p.get('tool')}, state keys: {list(p.get('state',{}).keys())}")
            except Exception as e:
                print(f"    parse error: {e}")
    else:
        print(f"  parts: 0")

conn.close()
