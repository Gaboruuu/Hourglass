import { load as loadHtml } from "cheerio";
import { request } from "undici";

async function checkEventType(url: string) {
  console.log(`\nChecking: ${url}`);
  const { body } = await request(url, { method: "GET" });
  const html = await body.text();
  const $ = loadHtml(html);

  // Look for Type heading
  const typeHeading = $("h2, h3, h4")
    .filter((_, el) =>
      /^type$/i.test(
        $(el)
          .text()
          .replace(/\[edit\]|\[\]/gi, "")
          .trim()
      )
    )
    .first();

  if (typeHeading.length) {
    console.log("Found Type heading!");
    let n = typeHeading.next();
    for (let i = 0; i < 5 && n && n.length; i++) {
      const txt = $(n).text().trim();
      console.log(
        `  Next ${i}: <${n.prop("tagName")}> "${txt.substring(0, 100)}"`
      );
      if (txt) {
        const a = n.find("a").first();
        const typeText = a.length ? a.text().trim() : txt;
        console.log(`  => Type: "${typeText}"`);
        return;
      }
      n = n.next();
    }
  } else {
    console.log("No Type heading found");
  }
}

(async () => {
  await checkEventType(
    "https://wutheringwaves.fandom.com/wiki/Twitch_Drops/2025-10-08"
  );
  await checkEventType(
    "https://wutheringwaves.fandom.com/wiki/Gifts_of_Approaching_Dawn"
  );
  await checkEventType(
    "https://wutheringwaves.fandom.com/wiki/Wuthering_Waves_Battle_Rush/2025-10-09"
  );
  await checkEventType(
    "https://wutheringwaves.fandom.com/wiki/Pioneer_Podcast/2025-10-09"
  );
})().catch(console.error);
