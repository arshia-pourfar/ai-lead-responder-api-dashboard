import sqlite3
import json
from datetime import datetime

DB_PATH = r"C:\Users\Arshia pourfar\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Get messages from key sessions (not the current one)
sessions_to_check = [
    "ses_0cd9317c0ffe517R61heYG3amU",  # Debugging login issues
    "ses_0f1354bf9ffekm8U9fCV62hZBB",  # Auto Dream
    "ses_0f1354c63ffesXeM2V695AC7H3",  # Creating or updating AGENTS.md
    "ses_0f1338ad2ffepiZpB3VmFKX876",  # checkpoint-writer
    "ses_0f1406f24ffeQyqhLCWk02eZ1x",  # Expert software architect
    "ses_0f1406f4bffel24rgmdHLh6zhF",  # Analyze codebase
]

for sid in sessions_to_check:
    cur.execute("SELECT title FROM session WHERE id=?", (sid,))
    row = cur.fetchone()
    title = row[0] if row else "unknown"
    print(f"\n{'='*80}")
    print(f"SESSION: {title[:100]}")
    print(f"ID: {sid}")
    print(f"{'='*80}")

    cur.execute("""
        SELECT id, data FROM message
        WHERE session_id=? AND agent_id IS NULL
        ORDER BY time_created
    """, (sid,))
    messages = cur.fetchall()

    for msg_id, data_str in messages:
        try:
            msg = json.loads(data_str)
        except:
            continue
        role = msg.get('role', '?')
        if role == 'user':
            # Get text parts
            cur.execute("""
                SELECT data FROM part
                WHERE message_id=? AND session_id=?
                ORDER BY time_created
            """, (msg_id, sid))
            parts = cur.fetchall()
            for p_data_str in parts:
                try:
                    p = json.loads(p_data_str)
                    if p.get('type') == 'text':
                        text = p.get('text', '')[:300]
                        print(f"\n[USER]: {text}")
                except:
                    pass

        elif role == 'assistant':
            cur.execute("""
                SELECT data FROM part
                WHERE message_id=? AND session_id=?
                ORDER BY time_created
            """, (msg_id, sid))
            parts = cur.fetchall()
            for p_data_str in parts:
                try:
                    p = json.loads(p_data_str)
                    if p.get('type') == 'text':
                        text = p.get('text', '')[:400]
                        print(f"\n[ASSISTANT]: {text}")
                    elif p.get('type') == 'tool':
                        tool = p.get('tool', '?')
                        state = p.get('state', {})
                        inp = str(state.get('input', ''))[:150]
                        print(f"\n[TOOL]: {tool} -> {inp}")
                except:
                    pass

conn.close()
