import { load as loadHtml } from "cheerio";
import { request } from "undici";

async function debug() {
  const url = "https://wutheringwaves.fandom.com/wiki/Event";
  const { body } = await request(url, { method: "GET" });
  const html = await body.text();
  const $ = loadHtml(html);

  // Find Current section
  $("h2, h3").each((_, h) => {
    const text = $(h)
      .text()
      .replace(/\[edit\]|\[\]/gi, "")
      .trim();
    if (/^current$/i.test(text)) {
      console.log("Found Current section!");

      // Find table
      let el = $(h).next();
      while (el && el.length) {
        if (el.is("table") || (el.is("div") && el.find("table").length)) {
          const table = el.is("table") ? el : el.find("table").first();
          console.log("\nTable headers:");
          const headers = table.find("tr").first().find("th, td").toArray();
          headers.forEach((th, i) => {
            console.log(`  ${i}: "${$(th).text().trim()}"`);
          });

          console.log("\nFirst data row:");
          const firstRow = table.find("tr").eq(1);
          const cells = firstRow.find("td").toArray();
          cells.forEach((td, i) => {
            const text = $(td).text().trim().substring(0, 50);
            console.log(`  ${i}: "${text}..."`);
          });
          return false; // break
        }
        el = el.next();
      }
    }
  });
}

debug().catch(console.error);
