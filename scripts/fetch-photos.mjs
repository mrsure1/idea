// 각 숙소 페이지에서 사진을 찾아 images/ 에 내려받는다.
// GitHub Actions 러너에서 실행된다 (개발 환경은 외부 접속이 막혀 있음).
import { writeFile, mkdir } from "node:fs/promises";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

// 숙소코드 → 사진을 찾을 페이지들 (객실 페이지를 홈페이지보다 앞에 둔다)
const TARGETS = {
  utop:          ["https://www.utopboutique.com/"],
  breev:         ["https://www.lottehotel.com/gwangju-breev/ko/rooms.html",
                  "https://www.lottehotel.com/gwangju-breev/ko"],
  holidayinn:    ["https://www.ihg.com/holidayinn/hotels/us/en/gwangju/kwjsu/hoteldetail"],
  mudeungpark:   ["http://www.hotelmudeungpark.co.kr/"],
  acc:           ["http://acchotel.kr/sub.php?code=WGXGbW3J", "https://acchotel.kr/"],
  forest:        ["https://www.forestindamyang.co.kr/", "https://forestindamyang.modoo.at/"],
  eunhye:        ["https://www.airbnb.co.kr/rooms/32963781"],
  bomnal:        ["https://www.airbnb.co.kr/rooms/1452614463682962740"],
  grasse:        ["http://grasse.co.kr/"],
  metapension:   ["http://www.metapension.com/", "http://www.metapension.com/pension_resv/resv_form1.htm"],
  healing9:      ["http://www.thehealing9.co.kr/m/camp.html", "http://thehealing9.co.kr/"],
  damyangresort: ["http://damyangresort.com/"]
};

const BAD = /logo|icon|favicon|btn_|button|banner|bg_|bullet|arrow|sprite|blank|spacer|loading|watermark|kakao|naver|facebook|instagram|youtube|\.svg($|\?)/i;

async function get(url, asBuffer = false){
  const res = await fetch(url, {
    headers: {"user-agent": UA, "accept-language": "ko,en;q=0.8"},
    redirect: "follow",
    signal: AbortSignal.timeout(25000)
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : await res.text();
}

function candidates(html, base){
  const out = [];
  const push = u => {
    if(!u) return;
    try{ out.push(new URL(u.replace(/&amp;/g, "&").trim(), base).href); }catch{}
  };
  // og / twitter 대표 이미지가 보통 가장 좋은 사진이다
  for(const re of [/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)/gi,
                   /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/gi,
                   /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi]){
    let m; while((m = re.exec(html))) push(m[1]);
  }
  let m;
  const img = /<img[^>]+(?:data-src|data-original|src)=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)/gi;
  while((m = img.exec(html))) push(m[1]);
  const css = /url\((["']?)([^)"']+\.(?:jpe?g|png|webp)[^)"']*)\1\)/gi;
  while((m = css.exec(html))) push(m[2]);
  return [...new Set(out)].filter(u => !BAD.test(u));
}

function ext(type, url){
  if(/png/i.test(type) || /\.png/i.test(url)) return "png";
  if(/webp/i.test(type) || /\.webp/i.test(url)) return "webp";
  return "jpg";
}

await mkdir("images", {recursive: true});
const report = [];

for(const [slug, pages] of Object.entries(TARGETS)){
  let urls = [];
  for(const page of pages){
    try{
      urls.push(...candidates(await get(page), page));
    }catch(e){ report.push(`  ! ${slug}: ${page} → ${e.message}`); }
    if(urls.length >= 12) break;
  }
  urls = [...new Set(urls)];

  let saved = 0;
  for(const u of urls){
    if(saved >= 3) break;
    try{
      const res = await fetch(u, {headers:{"user-agent":UA, referer: pages[0]},
                                 signal: AbortSignal.timeout(25000)});
      if(!res.ok) continue;
      const type = res.headers.get("content-type") || "";
      if(!/^image\//i.test(type)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if(buf.length < 25000) continue;              // 아이콘·장식용 이미지 거르기
      if(buf.length > 6_000_000) continue;
      saved++;
      await writeFile(`images/${slug}-${saved}.${ext(type, u)}`, buf);
    }catch{}
  }
  report.push(`${saved === 0 ? "✗" : "✓"} ${slug}: ${saved}장 (후보 ${urls.length}개)`);
}

console.log("\n=== 사진 수집 결과 ===");
console.log(report.join("\n"));
