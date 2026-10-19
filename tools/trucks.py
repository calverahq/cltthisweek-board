#!/usr/bin/env python3
"""Build trucks.json from the public weekly schedule at foodtruckscharlotte.org.

Keeps stops that are open to the public and within about 14 miles of Uptown.
Run from the repo root:  python3 tools/trucks.py
"""
import html, json, math, re, sys, urllib.request
from datetime import datetime, timezone, timedelta

SRC = "https://foodtruckscharlotte.org/"
UPTOWN = (35.2271, -80.8431)
MAX_MI = 14
# Stops that usually aren't open to the public: schools and school games, private
# residential and workplace events, hospitals' staff lunches, private parties.
PRIVATE = re.compile(r"\b(elementary|middle school|high school|\bhs\b|academy|homecoming|football|"
    r"tournament|pta|school|apartments?|apts|residences|living|senior|hoa|neighborhood|subdivision|"
    r"atrium health|novant|hospital|medical|clinic|private|employee|staff|wedding|birthday|"
    r"church|ministr|corporate|office park|warehouse|distribution center|plant\b|expo|charlotte lab)\b", re.I)

def miles(a, b):
    R = 3958.8; t = math.pi / 180
    dla = (b[0] - a[0]) * t; dlo = (b[1] - a[1]) * t
    h = math.sin(dla / 2) ** 2 + math.cos(a[0] * t) * math.cos(b[0] * t) * math.sin(dlo / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

def clock(tok):
    """'11am' -> '11:00 AM', '5:30pm' -> '5:30 PM'"""
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", tok.strip(), re.I)
    if not m: return None
    return f"{int(m[1])}:{m[2] or '00'} {m[3].upper()}"

def text(chunk, cls):
    m = re.search(r'class="%s"[^>]*>(.*?)</div>' % cls, chunk, re.S)
    if not m: return ""
    return html.unescape(re.sub(r"<[^>]+>", " ", m[1])).replace("\xa0", " ").strip()

def main():
    req = urllib.request.Request(SRC, headers={"User-Agent": "Mozilla/5.0 (cltthisweek board)"})
    page = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    rows = re.split(r'(?=<div id="post_\d+" class="eve_row)', page)
    eastern = timezone(timedelta(hours=-4))  # schedule start stamps are converted below
    seen, days = set(), {}
    for r in rows[1:]:
        head = re.match(r'<div id="post_(\d+)"[^>]*\bst="(\d+)"[^>]*tname="([^"]*)"[^>]*lat="([-\d.]+)"[^>]*lng="([-\d.]+)"', r)
        if not head: continue
        pid, st, slug, lat, lng = head.groups()
        name = html.unescape(re.sub(r"<[^>]+>", "", re.search(r'class="eve_name">(.*?)</h3>', r, re.S)[1])).strip()
        spot = text(r, "eve_addy"); st1 = text(r, "eve_st1"); st2 = text(r, "eve_st2"); when = text(r, "eve_time")
        cuisine = text(r, "eve_cuis")
        lat, lng = float(lat), float(lng)
        if not (lat and lng) or miles(UPTOWN, (lat, lng)) > MAX_MI: continue
        if PRIVATE.search(spot) or PRIVATE.search(st1): continue
        parts = [p for p in re.split(r"\s*-\s*", when) if p]
        start = clock(parts[0]) if parts else None
        end = clock(parts[1]) if len(parts) > 1 else None
        if not start: continue
        if re.search(r"\bSC\b", st2): continue  # coverage is the North Carolina side
        h = int(start.split(":")[0]) % 12 + (12 if start.endswith("PM") else 0)
        if h < 5: continue  # overnight times on the source are almost always entry errors
        # the day attribute is the site's own local-day bucket, e.g. "Friday (10/23)"
        dm = re.search(r'day="[^"(]*\((\d{1,2})/(\d{1,2})\)"', r)
        now = datetime.now(eastern)
        if dm:
            mo, dd = int(dm[1]), int(dm[2])
            yr = now.year + (1 if mo < now.month - 6 else 0)
            date = f"{yr:04d}-{mo:02d}-{dd:02d}"
        else:
            date = datetime.fromtimestamp(int(st), eastern).strftime("%Y-%m-%d")
        key = (date, slug, spot, start)
        if key in seen: continue
        seen.add(key)
        city = re.sub(r",?\s*(NC|SC)\s*\d{5}.*$", "", st2).strip(" ,")
        days.setdefault(date, []).append({
            "truck": name, "cuisine": cuisine, "spot": spot, "street": st1, "city": city,
            "start": start, "end": end, "lat": round(lat, 5), "lon": round(lng, 5),
            "url": SRC.rstrip("/") + "/member/" + slug})
    out = {"updated": datetime.now(eastern).strftime("%Y-%m-%d"), "source": SRC,
           "days": [{"date": d, "stops": days[d]} for d in sorted(days)]}
    json.dump(out, open("trucks.json", "w"), ensure_ascii=False, indent=1)
    total = sum(len(d["stops"]) for d in out["days"])
    print(f"trucks.json: {total} public stops over {len(out['days'])} days")
    if total == 0: sys.exit("No stops parsed; the source page may have changed.")

if __name__ == "__main__":
    main()
