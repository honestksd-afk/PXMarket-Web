// 쿠팡 파트너스 딥링크 API로 전용 링크가 없는 상품의 링크를 만들어 overrides.json에 저장
// 사용: pipeline 폴더에서 npm run links            (전체)
//       npm run links -- --limit 20                 (앞에서 20개만, 테스트용)
// 키: 저장소 루트 .env 의 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY
// 링크를 만든 뒤에는 npm run build 로 products.json 에 반영
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from './lib.mjs';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const env = Object.fromEntries(
  fs.readFileSync('../.env', 'utf8').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const { COUPANG_ACCESS_KEY: ACCESS_KEY, COUPANG_SECRET_KEY: SECRET_KEY } = env;
if (!ACCESS_KEY || !SECRET_KEY) { console.error('.env에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY가 필요합니다.'); process.exit(1); }

const API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
const BATCH_SIZE = 10;
const DELAY_MS = 1300; // 딥링크 API 분당 호출 제한 대비

async function deeplink(urls) {
  const datetime = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '') + 'Z';
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(datetime + 'POST' + API_PATH).digest('hex');
  const res = await fetch(`https://api-gateway.coupang.com${API_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ coupangUrls: urls }),
  });
  return res.json();
}

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? +process.argv[limitArg + 1] : Infinity;

const products = readJson('../public/data/products.json');
const overrides = readJson('data/overrides.json', {});
// link가 null = 쿠팡 판매 가능한데 전용 링크가 없는 상품
const todo = products.filter(p => p.link === null && !overrides[p.id]?.link).slice(0, limit);
console.log(`전용 링크 생성 대상 ${todo.length}개`);

let ok = 0, fail = 0;
for (let i = 0; i < todo.length; i += BATCH_SIZE) {
  const batch = todo.slice(i, i + BATCH_SIZE);
  const urls = batch.map(p => `https://www.coupang.com/np/search?q=${encodeURIComponent(p.name)}`);
  try {
    const r = await deeplink(urls);
    if (r.rCode !== '0' || !Array.isArray(r.data)) throw new Error(r.rMessage || r.message || JSON.stringify(r).slice(0, 120));
    // 응답 순서가 요청과 다를 수 있어 originalUrl로 매칭
    const byUrl = new Map(r.data.map(d => [d.originalUrl, d.shortenUrl]));
    batch.forEach((p, j) => {
      const link = byUrl.get(urls[j]) || r.data[j]?.shortenUrl;
      if (link) { (overrides[p.id] ??= {}).link = link; ok++; } else fail++;
    });
  } catch (e) {
    fail += batch.length;
    console.log(`  [${i + 1}~] 실패: ${e.message}`);
    if (/limit|exceed|429/i.test(e.message)) { console.log('호출 제한 — 1분 쉬고 계속'); await new Promise(r => setTimeout(r, 60000)); i -= BATCH_SIZE; continue; }
  }
  if ((i / BATCH_SIZE) % 10 === 0) { writeJson('data/overrides.json', overrides); console.log(`  ${Math.min(i + BATCH_SIZE, todo.length)}/${todo.length} (성공 ${ok})`); }
  await new Promise(r => setTimeout(r, DELAY_MS));
}
writeJson('data/overrides.json', overrides);
console.log(`완료: 성공 ${ok}, 실패 ${fail}. 이제 npm run build -- raw/px_all_YYYYMMDD.csv`);
