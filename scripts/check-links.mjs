// 페이지에 들어 있는 모든 외부 링크가 살아 있는지, https 로도 열리는지 확인한다.
import { readFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const html = await readFile("index.html", "utf8");
const urls = [...new Set([...html.matchAll(/https?:\/\/[^"'`\s<>)]+/g)].map(m => m[0]))]
  .filter(u => !/cdnjs|googleapis|gstatic|openstreetmap|microlink|thum\.io|wp\.com|dapi\.kakao|oapi\.map|maps\.google/.test(u))
  .sort();

async function probe(url){
  try{
    const res = await fetch(url, {headers:{"user-agent":UA}, redirect:"follow",
                                  signal: AbortSignal.timeout(20000)});
    return res.status;
  }catch(e){ return e.name === "TimeoutError" ? "timeout" : (e.cause?.code || "fail"); }
}

console.log("\n=== 링크 점검 ===\n");
for(const u of urls){
  const status = await probe(u);
  let note = "";
  if(u.startsWith("http://")){
    const s = await probe("https://" + u.slice(7));
    note = (typeof s === "number" && s < 400)
      ? `  → https 지원함! (${s}) 바꿀 것`
      : `  → https 안 됨 (${s})`;
  }
  console.log(`${String(status).padEnd(8)} ${u}${note}`);
}
