# CLT This Week board

The week-at-a-glance board for [cltthisweek.com](https://cltthisweek.com), served at https://board.cltthisweek.com.

- `index.html`: page markup
- `styles.css`: styles
- `app.js`: board logic (filters, calendar, map, date night)
- `events.json`: listings, refreshed every morning
- `basemap.json`: map shapes

When you change `styles.css` or `app.js`, bump the `?v=` value on its tag in `index.html` so browsers pick up the new file.

## Section pages and search
`/trivia/`, `/this-weekend/`, `/food-trucks/`, `/kids/`, `/museums/`, `/outdoors/` and `/calendar/` are copies of index.html that open on one section, each with its own title and description for search. After any change to index.html, run `python3 tools/pages.py` to rebuild them along with sitemap.xml and robots.txt.

## Automatic feeds
`python3 tools/update_feeds.py` refreshes trucks.json (foodtruckscharlotte.org) and discgolf.json (Disc Golf Scene). Each feed keeps its old file if its source fails. play.json is a hand-kept list of adult leagues.

## Where to eat (food.json)
Weekly research files live in tools/food_research/ (one JSON per research run). `python3 tools/food_rank.py tools/food_research/*.json` scores and ranks them into food.json; see the script's header for the scoring. Places not confirmed open wait in food.json's "held" list until a later run checks them.
