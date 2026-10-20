#!/usr/bin/env python3
"""Build the search-friendly section pages (/trivia/, /this-weekend/ ...), sitemap.xml and robots.txt
from index.html. Run from the repo root after any change to index.html:  python3 tools/pages.py
Each section page is the same board, opened on that section, with its own title and description."""
import os, re

SITE = "https://board.cltthisweek.com"
HOME = {
    "title": "Things to do in Charlotte this week | CLT This Week",
    "desc": "Everything happening in Charlotte this week, updated every morning: brewery trivia, Survey Says and music bingo, concerts, festivals, food trucks, markets, kids' events and free things to do.",
}
PAGES = [
    ("this-weekend", "weekend", "Things to do in Charlotte this weekend | CLT This Week",
     "What's happening in Charlotte this weekend, Friday night through Sunday: festivals, concerts, markets, brunch, trivia, food trucks and free things to do. Updated every morning."),
    ("trivia", "games", "Trivia nights in Charlotte tonight and this week | CLT This Week",
     "Every brewery and bar trivia night in Charlotte, plus Survey Says, music bingo and game nights, by day and time. Updated every morning."),
    ("food-trucks", "food", "Charlotte food trucks today: where they are this week | CLT This Week",
     "Where Charlotte's food trucks are today and every day this week, plus Food Truck Fridays in South End, University City and Plaza Midwood. Updated every morning."),
    ("kids", "kids", "Kids' events in Charlotte this week | CLT This Week",
     "Storytimes, toddler programs, kids' classes, children's theater and family events around Charlotte this week. Updated every morning."),
    ("museums", "arts", "Charlotte museums, exhibits and free museum days | CLT This Week",
     "What's on at Charlotte's museums and galleries, current exhibits, free museum nights and arts events this week."),
    ("outdoors", "outdoors", "Outdoor things to do in Charlotte this week | CLT This Week",
     "Run clubs, nature walks, greenways, outdoor festivals and the best weather day this week around Charlotte."),
    ("disc-golf", "play", "Disc golf tournaments and leagues near Charlotte | CLT This Week",
     "Upcoming disc golf tournaments and weekly leagues around Charlotte, Huntersville, Matthews and Rock Hill, plus adult rec and social sports leagues to join. Updated every morning."),
    ("calendar", "calendar", "Charlotte events calendar this month and next | CLT This Week",
     "A two-month calendar of Charlotte festivals, concerts, holiday events, home games and museum days."),
]

def esc(s): return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

def head(h, title, desc, url):
    h = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", h, flags=re.S)
    for pat, val in [(r'(<meta name="description" content=")[^"]*', desc), (r'(<link rel="canonical" href=")[^"]*', url),
                     (r'(<meta property="og:title" content=")[^"]*', title), (r'(<meta property="og:description" content=")[^"]*', desc),
                     (r'(<meta property="og:url" content=")[^"]*', url)]:
        h, n = re.subn(pat, lambda m: m[1] + esc(val), h)
        assert n == 1, pat
    return h

def main():
    src = open("index.html").read()
    home = head(src, HOME["title"], HOME["desc"], SITE + "/")
    if home != src: open("index.html", "w").write(home)
    for slug, tab, title, desc in PAGES:
        h = head(home, title, desc, f"{SITE}/{slug}/")
        h = h.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n<meta name="clt-tab" content="{tab}">', 1)
        os.makedirs(slug, exist_ok=True)
        open(f"{slug}/index.html", "w").write(h)
    urls = [SITE + "/"] + [f"{SITE}/{p[0]}/" for p in PAGES]
    open("sitemap.xml", "w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><changefreq>daily</changefreq></url>\n" for u in urls) + "</urlset>\n")
    open("robots.txt", "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"Built {len(PAGES)} section pages, sitemap.xml and robots.txt")

if __name__ == "__main__":
    main()
