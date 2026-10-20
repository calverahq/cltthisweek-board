#!/usr/bin/env python3
"""Build discgolf.json: upcoming disc golf tournaments and leagues around Charlotte,
from Disc Golf Scene's public North and South Carolina lists.
Run from the repo root:  python3 tools/discgolf.py   (takes about a minute: the site asks for 20s between requests)"""
import html, json, re, sys, time, urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

BASE = "https://www.discgolfscene.com"
UA = {"User-Agent": "Mozilla/5.0 (cltthisweek board)"}
NEAR = {"charlotte", "matthews", "mint hill", "huntersville", "harrisburg", "pineville", "belmont", "mount holly",
        "stallings", "indian trail", "cornelius", "davidson", "concord", "kannapolis", "monroe", "waxhaw", "gastonia",
        "mooresville", "fort mill", "rock hill", "tega cay", "lake wylie", "clover", "denver", "midland", "weddington"}
CLOSE = {"charlotte", "matthews", "mint hill", "huntersville", "harrisburg", "pineville", "belmont", "mount holly", "stallings"}
MON = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
DAYS_AHEAD = 75

def get(path):
    req = urllib.request.Request(BASE + path, headers=UA)
    return urllib.request.urlopen(req, timeout=40).read().decode("utf-8", "replace")

def clean(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()

def dates(info):
    """'PDGA C-tier · Sat-Sun, Nov 21-22, 2026' / 'Sat, Oct 24, 2026' / 'Nov 30 - Dec 1, 2026' -> (start, end)"""
    m = re.search(r"([A-Z][a-z]{2}) (\d{1,2})\s*-\s*([A-Z][a-z]{2}) (\d{1,2}), (\d{4})", info)
    if m:
        y = int(m[5]); a = date(y, MON[m[1].lower()], int(m[2])); b = date(y, MON[m[3].lower()], int(m[4]))
        if b < a: b = b.replace(year=y + 1)
        return a, b
    m = re.search(r"([A-Z][a-z]{2}) (\d{1,2})(?:\s*-\s*(\d{1,2}))?, (\d{4})", info)
    if not m or m[1].lower() not in MON: return None, None
    y, mo = int(m[4]), MON[m[1].lower()]
    a = date(y, mo, int(m[2])); b = date(y, mo, int(m[3])) if m[3] else a
    return a, b

def tournaments(page, today):
    out = []
    for blk in re.split(r'<div class="tournament-list list-record', page)[1:]:
        href = re.search(r'href="(https://www\.discgolfscene\.com/tournaments/[^"]+)"', blk)
        name = re.search(r'<span class="name">(.*?)</span>', blk, re.S)
        if not (href and name): continue
        if re.search(r"sponsorship|tee sign", clean(name[1]), re.I): continue  # fundraising listings, not events
        info1 = clean(re.findall(r'<span class="info">(.*?)</span>', blk, re.S)[0]) if re.search(r'<span class="info">', blk) else ""
        a, b = dates(info1)
        if not a or b < today or a > today + timedelta(days=DAYS_AHEAD): continue
        course = re.search(r'fa-map count"></i><b>(.*?)</b>', blk); city = re.search(r'fa-map-marker-alt count"></i><b>(.*?)</b>', blk)
        if not city: continue
        cty, _, st = clean(city[1]).rpartition(", ")
        if cty.lower() not in NEAR: continue
        players = re.search(r'fa-user-group count"></i><b>([\d ]+)(?:/\s*(\d+))?</b>', blk)
        fmt = re.search(r'fa-clipboard-list count"></i><b>(.*?)</b>', blk)
        tier = info1.split("·")[0].strip() if "·" in info1 else ""
        out.append({"name": clean(name[1]), "url": href[1], "start": a.isoformat(), "end": b.isoformat(),
                    "tier": tier, "format": clean(fmt[1]) if fmt else "", "course": clean(course[1]) if course else "",
                    "city": cty, "state": st, "close": cty.lower() in CLOSE,
                    "players": int(players[1].strip()) if players else None,
                    "cap": int(players[2]) if players and players[2] else None,
                    "regOpen": "list-reg-open" in blk})
    return out

def leagues(page):
    out = []
    for blk in re.split(r'<div class="list-record league-list', page)[1:]:
        href = re.search(r'href="(https://www\.discgolfscene\.com/league/[^"]+)"', blk)
        name = re.search(r'<span class="name">(.*?)</span>', blk, re.S)
        city = re.search(r'fa-map-marker-alt count"></i>([^<]+)', blk)
        if not (href and name and city): continue
        cty, _, st = clean(city[1]).rpartition(", ")
        if cty.lower() not in NEAR: continue
        season = re.search(r"&middot;\s*([^<]+?)\s*</span>", blk)
        fmt = re.search(r'fa-clipboard-list count"></i>([^<]+)', blk)
        when = re.search(r'fa-calendar-alt count"></i>([^<]+)', blk)
        out.append({"name": clean(name[1]), "url": href[1], "city": cty, "state": st,
                    "season": clean(season[1]) if season else "", "format": clean(fmt[1]) if fmt else "",
                    "when": clean(when[1]) if when else ""})
    return out

def main():
    today = datetime.now(ZoneInfo("America/New_York")).date()
    ts, ls = [], []
    for i, st in enumerate(["North_Carolina", "South_Carolina"]):
        if i: time.sleep(21)
        ts += tournaments(get(f"/tournaments/{st}"), today)
    time.sleep(21)
    ls = leagues(get("/leagues/North_Carolina"))
    seen = set(); ts = [t for t in sorted(ts, key=lambda t: (t["start"], t["name"])) if not (t["url"] in seen or seen.add(t["url"]))]
    if not ts and not ls: sys.exit("No disc golf events parsed; the source page may have changed. discgolf.json left as it was.")
    json.dump({"updated": today.isoformat(), "source": BASE, "tournaments": ts, "leagues": ls},
              open("discgolf.json", "w"), ensure_ascii=False, indent=1)
    print(f"discgolf.json: {len(ts)} tournaments, {len(ls)} leagues")

if __name__ == "__main__":
    main()
