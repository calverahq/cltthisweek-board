# CLT This Week board

The week-at-a-glance board for [cltthisweek.com](https://cltthisweek.com), served at https://board.cltthisweek.com.

- `index.html`: page markup
- `styles.css`: styles
- `app.js`: board logic (filters, calendar, map, date night)
- `events.json`: listings, refreshed every morning
- `basemap.json`: map shapes

When you change `styles.css` or `app.js`, bump the `?v=` value on its tag in `index.html` so browsers pick up the new file.
