#!/usr/bin/env python3
"""Run every automatic feed (food trucks, disc golf). Each feed keeps its old file if it fails.
Run from the repo root:  python3 tools/update_feeds.py   Exits nonzero if any feed failed."""
import subprocess, sys
FEEDS = ["tools/trucks.py", "tools/discgolf.py"]
failed = []
for f in FEEDS:
    r = subprocess.run([sys.executable, f], capture_output=True, text=True, timeout=300)
    print(f"{f}: {(r.stdout or r.stderr).strip().splitlines()[-1] if (r.stdout or r.stderr).strip() else 'no output'}")
    if r.returncode: failed.append(f)
if failed: sys.exit("Failed: " + ", ".join(failed))
