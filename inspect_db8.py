import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get all text parts from recent sessions (last 30 days)
# Current date: July 5, 2026 - 30 days ago: June 5, 2026
cutoff_ms = 1780756680215  # Jun 2, 2026 timestamp from earlier

cur.execute("""
    SELECT p.id, p.message_id, p.data, m.session_id, m.agent_id, m.time_created
    FROM part p
    JOIN message m ON p.message_id = m.id
    WHERE p.time_created > ?
    ORDER BY p.time_created
""", (cutoff_ms,))

rows = cur.fetchall()
print(f"=== TEXT PARTS FROM LAST 30 DAYS ({len(rows)} total) ===\n")

current_session = None
for pid, mid, data_str, sid, agent_id, tc in rows:
    if sid != current_session:
        current_session = sid
        # Get session title
        cur.execute("SELECT title FROM session WHERE id=?", (sid,))
        title_row = cur.fetchone()
        title = title_row[0] if title_row else "unknown"
        dt = datetime.fromtimestamp(tc / 1000).strftime('%Y-%m-%d %H:%M')
        print(f"\n{'='*80}")
        print(f"SESSION: {title[:100]}")
        print(f"ID: {sid} | Started: {dt}")
        print(f"{'='*80}")

    try:
        p = json.loads(data_str) if isinstance(data_str, str) else {}
    except:
        continue

    ptype = p.get('type', '?')

    if ptype == 'text':
        text = p.get('text', '')
        if text and len(text.strip()) > 5:
            # Truncate long text
            display = text[:500] + '...' if len(text) > 500 else text
            print(f"\n  [{agent_id or 'main'}] TEXT: {display}")

    elif ptype == 'tool':
        tool = p.get('tool', '?')
        state = p.get('state', {})
        inp = state.get('input', {})
        out = state.get('output', '')

        if isinstance(inp, dict):
            # Summarize input
            if 'command' in inp:
                print(f"\n  [{agent_id or 'main'}] TOOL: {tool} -> cmd: {inp['command'][:150]}")
            elif 'file_path' in inp:
                print(f"\n  [{agent_id or 'main'}] TOOL: {tool} -> file: {inp['file_path'][:100]}")
            elif 'pattern' in inp:
                print(f"\n  [{agent_id or 'main'}] TOOL: {tool} -> pattern: {inp['pattern']}")
            else:
                print(f"\n  [{agent_id or 'main'}] TOOL: {tool} -> {str(inp)[:150]}")
        else:
            print(f"\n  [{agent_id or 'main'}] TOOL: {tool} -> {str(inp)[:150]}")

        if out and isinstance(out, str):
            out_preview = out[:200].replace('\n', ' ')
            print(f"    output: {out_preview}")

conn.close()
