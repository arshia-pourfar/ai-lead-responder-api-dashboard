import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Check parts structure more carefully
cur.execute("SELECT id, message_id, data FROM part LIMIT 5")
rows = cur.fetchall()

for pid, mid, data in rows:
    print(f"\n--- Part {pid} (msg={mid}) ---")
    print(f"  data type: {type(data)}")
    if isinstance(data, str):
        try:
            d = json.loads(data)
            print(f"  parsed keys: {list(d.keys())}")
            print(f"  type: {d.get('type')}")
            if d.get('type') == 'text':
                print(f"  text: {d.get('text','')[:200]}")
            elif d.get('type') == 'tool':
                print(f"  tool: {d.get('tool')}")
                state = d.get('state', {})
                print(f"  state keys: {list(state.keys())}")
                if 'input' in state:
                    inp = state['input']
                    print(f"  input: {str(inp)[:200]}")
                if 'output' in state:
                    out = state['output']
                    print(f"  output: {str(out)[:200]}")
        except Exception as e:
            print(f"  parse error: {e}")
            print(f"  raw[:300]: {data[:300]}")
    elif isinstance(data, tuple):
        print(f"  tuple len: {len(data)}")
        print(f"  tuple: {data}")
    else:
        print(f"  raw: {str(data)[:200]}")

conn.close()
