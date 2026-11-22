/**
 * Generic section/table → raw rows.
 *
 * A section config (from games/<game>.js):
 *   { page: "home" | "events" | …, heading: /regex/, layout, status: "ongoing" | "upcoming",
 *     kind?: "event" | "banner", table?: /regex on the table's first row/, singleDate?: "start" | "end",
 *     itemLevel?: "h3" | "h4", optional?: true }
 *
 * Layouts:
 *   range           one row per event: name cell + a cell with the dates (text after an <hr> is the description)
 *   multiPerRow     several events per row: each cell = name link + dates
 *   splitRows       name cell + "Start | date" on one row, "End | date" on the next (rowspan)
 *   headingPerEvent one sub-heading per event, followed by a small "Start / End / Duration" table
 *
 * A raw row:
 *   { game, source, section, status, kind, name, link, image, dateText, description, singleDate, rowHtml }
 */
const source = require("./source");
const { absoluteUrl } = require("./client");
const { looksLikeDate } = require("./dates");
const { SourceLayoutError } = require("./errors");

const HEADINGS = "h2, h3, h4";
const LEVEL = { h2: 2, h3: 3, h4: 4 };
const DATE_LABEL = /^(?:event\s+)?(?:start|end|duration|dates?|period|schedule|availability)/i;

const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
const levelOf = (el) => LEVEL[el.tagName?.toLowerCase()] ?? null;

/** Text of an element with every text node separated by a space (cells glue words together otherwise) */
function textOf($, el) {
  const parts = [];
  const walk = (node) => {
    if (node.type === "text") parts.push(node.data);
    else if (node.type === "tag" && !["script", "style"].includes(node.name)) {
      if (["br", "hr"].includes(node.name)) parts.push(" ");
      (node.children || []).forEach(walk);
      parts.push(" ");
    }
  };
  $(el).each((_, node) => walk(node));
  return clean(parts.join(" ")).replace(/\s+([,.:;!?)])/g, "$1").replace(/\(\s+/g, "(");
}

/** A cell's text split at <hr> / <br>, empty parts dropped */
function segments($, el, skip = null) {
  const out = [[]];
  const walk = (node) => {
    if (skip && skip.includes(node)) return;
    if (node.type === "text") out[out.length - 1].push(node.data);
    else if (node.type === "tag" && !["script", "style"].includes(node.name)) {
      if (["br", "hr"].includes(node.name)) out.push([]);
      else {
        (node.children || []).forEach(walk);
        out[out.length - 1].push(" ");
      }
    }
  };
  $(el).each((_, node) => walk(node));
  return out.map((parts) => clean(parts.join(" ")).replace(/\s+([,.:;!?)])/g, "$1")).filter(Boolean);
}

/** The real image (lazy-loaded data-src on the source's image host), never the 1×1 placeholder */
function imageIn($, el) {
  let found = null;
  $(el)
    .find("img")
    .each((_, img) => {
      if (found) return;
      const url = $(img).attr("data-src") || $(img).attr("src") || "";
      try {
        if (new URL(url).hostname === source.imageHost) found = url;
      } catch {
        // data: placeholder or relative junk
      }
    });
  return found;
}

/** The main link of a cell: the first link with text (or with the image) */
function mainLink($, el) {
  const links = $(el).find("a[href]").toArray();
  return links.find((a) => clean($(a).text())) || links[0] || null;
}

function findHeading($, re) {
  return $(HEADINGS)
    .toArray()
    .find((el) => re.test(clean($(el).text())));
}

/** Everything after a heading up to the next heading of the same or a higher level */
function sectionNodes($, heading) {
  const level = levelOf(heading);
  const nodes = [];
  let node = heading.nextSibling;
  while (node) {
    if (node.type === "tag") {
      const l = levelOf(node);
      if (l && l <= level) break;
      // A wrapper that contains such a heading also ends the section
      const inner = $(node).find(HEADINGS).toArray();
      const stopAt = inner.find((h) => levelOf(h) <= level);
      if (stopAt) break;
      nodes.push(node);
    }
    node = node.nextSibling;
  }
  return nodes;
}

/** The tables of a section, in page order (a table may be wrapped in a div) */
function sectionTables($, heading) {
  const tables = [];
  for (const node of sectionNodes($, heading)) {
    if (node.tagName === "table") tables.push(node);
    else tables.push(...$(node).find("table").toArray());
  }
  return tables;
}

const dataRows = ($, table) =>
  $(table)
    .find("tr")
    .toArray()
    .filter((tr) => $(tr).children("td").length > 0);

/**
 * The date part of a cell's segments: the first segment with a date, plus the next one when the
 * range wraps onto a new line ("November 19, 2026 - <br> December 3, 2026"). Everything else is
 * the description.
 */
function pickDate(segs) {
  const first = segs.findIndex(looksLikeDate);
  if (first < 0) return { dateText: "", description: segs.join(" ") };
  let last = first;
  while (last + 1 < segs.length && /(?:[-–~]|\bto|\buntil)\s*$/i.test(segs[last]) && looksLikeDate(segs[last + 1])) last++;
  return {
    dateText: segs.slice(first, last + 1).join(" "),
    description: segs.filter((_, i) => i < first || i > last).join(" "),
  };
}

/** One cell = one event: the link is the name, the rest of the cell holds the dates */
function itemFromCell($, cell) {
  const link = mainLink($, cell);
  return {
    name: clean(link ? $(link).text() : textOf($, cell)),
    link: link ? absoluteUrl($(link).attr("href")) : null,
    image: imageIn($, cell),
    ...pickDate(segments($, cell, link ? [link] : null)),
  };
}

const LAYOUTS = {
  range($, table) {
    return dataRows($, table).map((tr) => {
      const cells = $(tr).children("td").toArray();
      const [nameCell, ...dateCells] = cells;
      const link = mainLink($, nameCell);
      const segs = dateCells.flatMap((c) => segments($, c));
      return {
        name: clean(link ? $(link).text() : textOf($, nameCell)),
        link: link ? absoluteUrl($(link).attr("href")) : null,
        image: imageIn($, nameCell),
        ...pickDate(segs),
        rowHtml: $.html(tr),
      };
    });
  },

  multiPerRow($, table) {
    const items = [];
    for (const tr of dataRows($, table)) {
      for (const cell of $(tr).children("td").toArray()) {
        if (!clean(textOf($, cell))) continue; // empty filler cell
        items.push({ ...itemFromCell($, cell), rowHtml: $.html(cell) });
      }
    }
    return items;
  },

  splitRows($, table) {
    const items = [];
    for (const tr of $(table).find("tr").toArray()) {
      const cells = $(tr).children("th, td").toArray();
      const nameCell = cells.find((c) => c.tagName === "td" && $(c).find("a[href], img").length);
      if (nameCell) {
        const link = mainLink($, nameCell);
        items.push({
          name: clean(link ? $(link).text() : textOf($, nameCell)),
          link: link ? absoluteUrl($(link).attr("href")) : null,
          image: imageIn($, nameCell),
          parts: [],
          rowHtml: $.html(tr),
        });
      }
      const current = items[items.length - 1];
      if (!current) continue;
      const rest = cells.filter((c) => c !== nameCell).map((c) => textOf($, c));
      if (rest.length) current.parts.push(rest.join(" "));
      if (!nameCell) current.rowHtml += $.html(tr);
    }
    return items.map(({ parts, ...item }) => ({ ...item, dateText: parts.join(" "), description: "" }));
  },
};

/** headingPerEvent works on the section's sub-headings instead of one table */
function headingPerEvent($, heading, section) {
  const itemLevel = LEVEL[section.itemLevel] || levelOf(heading) + 1;
  const items = [];
  for (const node of sectionNodes($, heading)) {
    const subHeadings = levelOf(node) === itemLevel ? [node] : $(node).find(HEADINGS).toArray().filter((h) => levelOf(h) === itemLevel);
    for (const sub of subHeadings) {
      const table = sectionTables($, sub)[0];
      if (!table) continue;
      const labelled = $(table)
        .find("tr")
        .toArray()
        .map((tr) => $(tr).children("th, td").toArray().map((c) => textOf($, c)))
        // "Event Start | November 4, 2026" — a header row like "Dates | Ongoing Events" isn't one
        .filter((cells) => cells.length >= 2 && DATE_LABEL.test(cells[0]) && looksLikeDate(cells.slice(1).join(" ")));
      if (labelled.length === 0) continue; // a summary table, not an event
      items.push({
        name: clean($(sub).text()),
        link: null,
        // The event's picture is usually right under its heading, before or inside the table
        image: imageIn($, table) || sectionNodes($, sub).map((n) => imageIn($, n)).find(Boolean) || null,
        dateText: labelled.map((cells) => cells.join(" ")).join(" "),
        description: "",
        rowHtml: $.html(table),
      });
    }
  }
  return items;
}

/**
 * Extract one section from a loaded page.
 * Returns { rows, warnings }. Throws SourceLayoutError for a required section that's missing or broken.
 */
function extractSection($, section, { game, url } = {}) {
  const context = { game, page: section.page, url, section: String(section.heading) };
  const warnings = [];
  const fail = (message, extra = {}) => {
    if (section.optional) {
      warnings.push(`${section.page} ${section.heading}: ${message} (optional, skipped)`);
      return { rows: [], warnings };
    }
    throw new SourceLayoutError(`${message} (${section.page} page, section ${section.heading})`, { ...context, ...extra });
  };

  const heading = findHeading($, section.heading);
  if (!heading) return fail("heading not found");
  const sectionName = clean($(heading).text());
  context.section = sectionName;

  let items;
  if (section.layout === "headingPerEvent") {
    items = headingPerEvent($, heading, section);
  } else {
    const layout = LAYOUTS[section.layout];
    if (!layout) throw new Error(`Unknown layout "${section.layout}" in the ${game} config`);
    let tables = sectionTables($, heading);
    if (section.table) {
      tables = tables.filter((t) => section.table.test(textOf($, $(t).find("tr").first())));
    }
    if (tables.length === 0) return fail(section.table ? `no table matching ${section.table}` : "no table under the heading");
    items = layout($, tables[0]);
  }

  for (const item of items) {
    if (!item.name) {
      throw new SourceLayoutError(`row without a name (section "${sectionName}")`, { ...context, rowHtml: item.rowHtml });
    }
  }
  if (items.length === 0 && section.status === "ongoing" && !section.optional) {
    return fail("no rows found");
  }

  const rows = items.map((item) => ({
    game,
    source: section.page,
    section: sectionName,
    status: section.status,
    kind: section.kind || "event",
    name: item.name,
    link: item.link,
    image: item.image,
    dateText: item.dateText,
    description: item.description,
    singleDate: section.singleDate || "start",
    rowHtml: item.rowHtml,
  }));
  return { rows, warnings };
}

module.exports = { extractSection, findHeading, sectionNodes, sectionTables, textOf, segments, imageIn };
