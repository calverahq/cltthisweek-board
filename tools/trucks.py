#!/usr/bin/env python3
"""Build trucks.json from the public weekly schedule at foodtruckscharlotte.org.

Keeps stops that are open to the public and within about 14 miles of Uptown.
Run from the repo root:  python3 tools/trucks.py
"""
import html, json, math, re, sys, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

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

def clock(tok, ampm=None):
    """'11am' -> '11:00 AM', '5:30pm' -> '5:30 PM'; ampm fills in a missing am/pm."""
    m = re.match(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?", tok.strip(), re.I)
    if not m or not (m[3] or ampm): return None
    h = int(m[1])
    if not 1 <= h <= 12: return None
    return f"{h}:{m[2] or '00'} {(m[3] or ampm).replace('.', '').upper()}"

def span(when):
    """'11am-2pm', '11-2pm', '11:30 am – 2 pm', '5pm to 9pm' -> ('11:00 AM', '2:00 PM')"""
    parts = [p for p in re.split(r"\s*(?:-|–|—|\bto\b)\s*", when, flags=re.I) if p.strip()]
    if not parts: return None, None
    end = clock(parts[1]) if len(parts) > 1 else None
    start = clock(parts[0])
    if not start and end:  # '11-2pm': borrow am/pm from the end, crossing noon when needed
        e_ap = end[-2:]; sh = int(re.match(r"\d+", parts[0].strip())[0]); eh = int(end.split(":")[0])
        # '11-2pm' and '10-12pm' start in the morning; '6-9pm' and '12-3pm' don't
        ap = "AM" if e_ap == "PM" and sh != 12 and (sh > eh or eh == 12) else e_ap
        start = clock(parts[0], ap)
    return start, end

def text(chunk, cls):
    m = re.search(r'class="%s"[^>]*>(.*?)</div>' % cls, chunk, re.S)
    if not m: return ""
    return html.unescape(re.sub(r"<[^>]+>", " ", m[1])).replace("\xa0", " ").strip()

def main():
    req = urllib.request.Request(SRC, headers={"User-Agent": "Mozilla/5.0 (cltthisweek board)"})
    page = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    rows = re.split(r'(?=<div id="post_\d+" class="eve_row)', page)
    eastern = ZoneInfo("America/New_York")
    seen, days = set(), {}
    for r in rows[1:]:
        head = re.match(r'<div id="post_(\d+)"[^>]*\bst="(\d+)"[^>]*tname="([^"]*)"[^>]*lat="([-\d.]+)"[^>]*lng="([-\d.]+)"', r)
        if not head: continue
        pid, st, slug, lat, lng = head.groups()
        nm = re.search(r'class="eve_name">(.*?)</h3>', r, re.S)
        if not nm: continue
        name = html.unescape(re.sub(r"<[^>]+>", "", nm[1])).strip()
        if not name: continue
        spot = text(r, "eve_addy"); st1 = text(r, "eve_st1"); st2 = text(r, "eve_st2"); when = text(r, "eve_time")
        cuisine = text(r, "eve_cuis")
        lat, lng = float(lat), float(lng)
        if not (lat and lng) or miles(UPTOWN, (lat, lng)) > MAX_MI: continue
        if PRIVATE.search(spot) or PRIVATE.search(st1): continue
        if re.fullmatch(r"[\w .]+ county", spot.strip(), re.I): continue  # bare county name, usually a staff stop
        start, end = span(when)
        if not start: continue
        if re.search(r"\bSC\b", st2): continue  # coverage is the North Carolina side
        h = int(start.split(":")[0]) % 12 + (12 if start.endswith("PM") else 0)
        if h < 5 or h >= 22: continue  # overnight times on the source are almost always entry errors
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
    total = sum(len(d["stops"]) for d in out["days"])
    if total == 0: sys.exit("No stops parsed; the source page may have changed. trucks.json left as it was.")
    json.dump(out, open("trucks.json", "w"), ensure_ascii=False, indent=1)
    print(f"trucks.json: {total} public stops over {len(out['days'])} days")

if __name__ == "__main__":
    main()
