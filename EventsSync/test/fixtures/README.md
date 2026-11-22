# Test fixtures

**Synthetic only.** These files copy the *structure* of the source's pages (headings, tables,
row markup, date formats) with made-up names, text and links. Never put a copied page here:
real snapshots from `npm run scraper:inspect -- <url> --save <name>` go to `EventsSync/.snapshots/`,
which is gitignored.

`{{IMG}}` is replaced with an image URL on the source's image host when a test loads the file
(see `test/helpers.js`), so the fixtures don't name the site.
