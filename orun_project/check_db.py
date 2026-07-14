import sqlite3, os

db_path = os.path.join(os.environ['APPDATA'], 'Orun OS', 'orun-os.sqlite3')
print(f"DB path: {db_path}")
print(f"DB size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for t in tables:
    name = t[0]
    try:
        count = conn.execute(f'SELECT count(*) FROM [{name}]').fetchone()[0]
        print(f"  {name}: {count} rows")
    except Exception as e:
        print(f"  {name}: ERROR - {e}")

# Check pragma settings
try:
    row_size = conn.execute("PRAGMA page_size").fetchone()[0]
    page_count = conn.execute("PRAGMA page_count").fetchone()[0]
    journal = conn.execute("PRAGMA journal_mode").fetchone()[0]
    print(f"\npage_size={row_size}, page_count={page_count}, journal={journal}")
except Exception as e:
    print(f"PRAGMA error: {e}")

conn.close()
