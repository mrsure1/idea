// 자바스크립트로 사진을 불러오는 사이트(브랜드 호텔 등)에서 사진을 가져온다.
// HTML 만 읽는 fetch-photos.mjs 로는 못 잡는 곳들을 위한 것.
// 결과는 images-review/ 에 넣는다 — 광고·포스터가 섞이므로 눈으로 고른 뒤 images/ 로 옮긴다.
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const TARGETS = {
  breev: ["https://www.lottehotel.com/gwangju-breev/ko/rooms.html",
          "https://www.lottehotel.com/gwangju-breev/ko"],
  holidayinn: ["https://www.ihg.com/holidayinn/hotels/us/en/gwangju/kwjsu/hoteldetail"],
  mudeungpark: ["https://www.hotelmudeungpark.co.kr/"],
  forest: ["https://www.forestindamyang.co.kr/", "https://forestindamyang.modoo.at/"],
  damyangresort: ["http://damyangresort.com/"]
};

const BAD = /logo|icon|favicon|btn_|button|banner|bullet|arrow|sprite|blank|spacer|watermark|popup|event|notice|kakao|naver|facebook|instagram|youtube/i;

await mkdir("images-review", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ko-KR",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
             "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
});

const report = [];

for (const [slug, pages] of Object.entries(TARGETS)) {
  const found = new Map();                       // url -> 화면에 그려진 면적

  for (const url of pages) {
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3500);
      // 게으르게 불러오는 사진을 끌어내려면 끝까지 스크롤해야 한다
      for (let y = 0; y < 6; y++) {
        await page.mouse.wheel(0, 1400);
        await page.waitForTimeout(1200);
      }
      const imgs = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("img")) {
          const r = el.getBoundingClientRect();
          if (el.naturalWidth >= 600 && el.naturalHeight >= 350) {
            out.push({ src: el.currentSrc || el.src,
                       area: Math.max(r.width * r.height, el.naturalWidth * el.naturalHeight / 8),
                       w: el.naturalWidth, h: el.naturalHeight });
          }
        }
        for (const el of document.querySelectorAll("*")) {
          const bg = getComputedStyle(el).backgroundImage;
          const m = bg && bg.match(/url\(["']?([^"')]+)/);
          if (m) {
            const r = el.getBoundingClientRect();
            if (r.width >= 500 && r.height >= 280)
              out.push({ src: m[1], area: r.width * r.height, w: r.width, h: r.height });
          }
        }
        return out;
      });
      for (const im of imgs) {
        if (!im.src || !/^https?:/.test(im.src) || BAD.test(im.src)) continue;
        const ratio = im.w / im.h;
        if (ratio > 3.0 || ratio < 0.45) continue;        // 띠배너·세로 포스터 거르기
        found.set(im.src, Math.max(found.get(im.src) || 0, im.area));
      }
    } catch (e) {
      report.push(`  ! ${slug}: ${url} → ${e.message.split("\n")[0]}`);
    }
    await page.close();
    if (found.size >= 10) break;
  }

  // 화면에서 크게 보이던 것부터
  const ranked = [...found.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  let saved = 0;
  for (const u of ranked) {
    if (saved >= 4) break;                                // 검수용으로 넉넉히
    try {
      const res = await ctx.request.get(u, { timeout: 25000 });
      if (!res.ok()) continue;
      const type = res.headers()["content-type"] || "";
      if (!/^image\//i.test(type)) continue;
      const buf = await res.body();
      if (buf.length < 30000 || buf.length > 8_000_000) continue;
      const ext = /png/i.test(type) ? "png" : /webp/i.test(type) ? "webp" : "jpg";
      saved++;
      await writeFile(`images-review/${slug}-${saved}.${ext}`, buf);
    } catch {}
  }
  report.push(`${saved ? "✓" : "✗"} ${slug}: ${saved}장 (후보 ${ranked.length}개)`);
}

await browser.close();
console.log("\n=== 브라우저 수집 결과 (images-review/) ===");
console.log(report.join("\n"));
