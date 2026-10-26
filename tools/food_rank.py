#!/usr/bin/env python3
"""Score and rank restaurant recommendations into food.json.
Input: a research JSON {"categories":[{"id","places":[{name, area, address, website, price, cuisine, why,
sources:[{type: reddit|forum|article, url, date, top, snippet}], open_check}]}]}.
Scoring (one entry per thread or article, never per comment):
  Reddit or forum thread from locals ... 3 points, +2 if it was a top-voted pick or named by 3+ commenters
  Local guide or article ............... 2 points if from the last ~2 years, 1.5 if 2-3 years old, 1 if older or undated
  Seen only in a search snippet ........ half points
  Sources more than 3 years old count half (threads too).
Ties go to the place with more independent sources. Places not confirmed open are held back, unless someone recommended them in the last 12 months.
Run from the repo root:  python3 tools/food_rank.py tools/food_research/*.json
Each research file may also list {"closed": ["Place name", ...]} to drop places that closed."""
import json, re, sys
from datetime import date
from urllib.parse import urlparse

CATS = [
 ("date-night", "Date night", "Special-occasion and romantic spots locals keep recommending."),
 ("late-night", "Late night eats", "Good food after 10 PM. Hours change, so check before you go."),
 ("cheap-eats", "Cheap eats", "Great food for around $15 or less a person."),
 ("brunch", "Brunch", "Weekend brunch spots people actually wait in line for."),
 ("patios", "Patios & rooftops", "Outdoor seating and views, with food worth staying for."),
 ("kid-friendly", "Kid-friendly", "Places parents recommend: room to move, kids' menus, relaxed crowds."),
 ("bbq", "BBQ & Southern", "Barbecue, fried chicken, meat-and-threes and soul food."),
 ("tacos", "Tacos & Mexican", "Taquerias and Mexican kitchens, from strip-mall spots to sit-down."),
 ("pizza", "Pizza", "Neapolitan, New York slices, Detroit squares and everything between."),
 ("burgers", "Burgers", "Smash burgers, drive-ins and bar burgers."),
 ("asian", "Asian", "Sushi, ramen, pho, Thai, Korean and more."),
 ("coffee", "Coffee shops", "Great coffee, with notes on which ones work for a laptop."),
 ("hidden-gems", "Hidden gems", "Underrated spots locals say more people should know about."),
]
TODAY = date.today()
# "Likely open" places count when someone recommended them recently; everything else waits for a check.
RECENT = f"{TODAY.year - 1}-{TODAY.month:02d}"

def age_years(d):
    m = re.match(r"(\d{4})(?:-(\d{1,2}))?", str(d or ""))
    if not m: return None
    y, mo = int(m[1]), int(m[2] or 6)
    return (TODAY.year - y) + (TODAY.month - mo) / 12

def points(s):
    a = age_years(s.get("date"))
    if s.get("type") in ("reddit", "forum"):
        p = 3 + (2 if s.get("top") else 0)
        if a is not None and a > 3: p /= 2
    else:
        p = 2 if a is not None and a <= 2 else 1.5 if a is not None and a <= 3 else 1
    if s.get("snippet"): p /= 2
    return p

def label(u):
    h = urlparse(u).netloc.replace("www.", "")
    if "reddit" in h or "sentinel-team" in h or "ggtyler" in h or "psf.lt" in h: return "r/Charlotte thread"
    names = {"axios.com": "Axios Charlotte", "theinfatuation.com": "The Infatuation", "charlottesgotalot.com": "Charlotte's Got A Lot",
             "charlottemagazine.com": "Charlotte Magazine", "cltledger.com": "Charlotte Ledger", "unpretentiouspalate.com": "Unpretentious Palate",
             "qcnerve.com": "Queen City Nerve", "scoopcharlotte.com": "Scoop Charlotte", "wbtv.com": "WBTV", "qclife.wbtv.com": "QC Life",
             "fun4charlottekids.com": "Fun 4 Charlotte Kids", "cardinalandpine.com": "Cardinal & Pine", "timeout.com": "Time Out",
             "tastingtable.com": "Tasting Table", "barbecuebros.com": "Barbecue Bros", "qcitymetro.com": "QCity Metro", "wsoctv.com": "WSOC"}
    for k, v in names.items():
        if h.endswith(k): return v
    return h

def main(paths):
    places = {c[0]: {} for c in CATS}
    held, closed = [], set()
    norm = lambda n: re.sub(r"[^a-z0-9]", "", n.lower())
    # Newest research file last, so its descriptions and open checks win. A place marked closed in any later file drops out.
    for path in sorted(paths):
        data = json.load(open(path))
        for n in data.get("closed", []): closed.add(norm(n))
        for c in data.get("categories", []):
            for p in c["places"]:
                oc = (p.get("open_check") or "").lower()
                newest = max([str(x.get("date") or "") for x in p.get("sources", [])] or [""])
                ok = oc.startswith("open") or (oc.startswith("likely open") and newest >= RECENT)
                if oc.startswith("closed"): closed.add(norm(p["name"])); continue
                if not ok:
                    held.append({"cat": c["id"], "name": p["name"], "status": oc[:120]}); continue
                key = norm(p["name"])
                if c["id"] not in places: continue
                cur = places[c["id"]].setdefault(key, {"sources": []})
                cur.update({k: v for k, v in p.items() if k != "sources" and v})
                seen = {s["url"] for s in cur["sources"]}
                cur["sources"] += [s for s in p.get("sources", []) if s.get("url") and s["url"] not in seen]
    cats = []
    for cid, name, blurb in CATS:
        ranked = []
        for key, p in places[cid].items():
            if key in closed: continue
            srcs = p["sources"]
            score = round(sum(points(s) for s in srcs), 1)
            red = sum(1 for s in srcs if s.get("type") in ("reddit", "forum"))
            ranked.append({"name": p["name"], "area": p.get("area", ""), "address": p.get("address", ""), "website": p.get("website", ""),
                           "price": p.get("price", ""), "cuisine": p.get("cuisine", ""), "why": p.get("why", ""), "score": score,
                           "threads": red, "guides": len(srcs) - red,
                           "sources": [{"type": s.get("type"), "url": s["url"], "date": s.get("date", ""), "label": label(s["url"])} for s in srcs]})
        ranked.sort(key=lambda x: (-x["score"], -(x["threads"] + x["guides"]), -x["threads"], x["name"]))
        for i, x in enumerate(ranked, 1): x["rank"] = i
        cats.append({"id": cid, "name": name, "blurb": blurb, "places": ranked})
    held = [h for h in held if norm(h["name"]) not in closed and not any(norm(h["name"]) in places[c] for c in places)]
    out = {"updated": TODAY.isoformat(), "method": __doc__.split("Scoring")[1].split("Run from")[0].strip(), "categories": cats, "held": held}
    json.dump(out, open("food.json", "w"), ensure_ascii=False, indent=1)
    print("food.json:", ", ".join(f"{c['id']} {len(c['places'])}" for c in cats), f"| held back {len(held)}")

if __name__ == "__main__":
    main(sys.argv[1:])
