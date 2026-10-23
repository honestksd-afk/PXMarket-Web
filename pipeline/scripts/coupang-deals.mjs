// '쿠팡이 더 싼 대용량' — 쿠팡 파트너스 상품 검색 API 가격과 PX 가격을 단위가격으로 비교해
// 쿠팡이 싼 것만 ../public/data/coupang-deals.json 에 저장 (사이트 첫 화면 띠 + 기준일 표기)
//
// 사용: pipeline 폴더에서 npm run deals                (캐시가 7일 넘은 검색어만, 최대 6번 호출)
//       npm run deals -- --max 10                       (이번 실행의 API 호출 상한)
//       npm run deals -- --force                        (캐시 무시하고 다시 조회)
//       npm run deals -- --dry                          (API 호출 없이 캐시로만 비교)
// 대상: data/deal-candidates.json (id, keyword, must, total, unit)
// 키:   저장소 루트 .env 의 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY (출력·로그 금지)
//
// 호출 보호: 검색 API는 한도가 빡빡하다고 알려져 있음(시간당 10회 안팎 보고). 호출 사이 2초,
// 오류(403/429/rCode≠0)가 한 번이라도 나면 즉시 멈춤. 조회 결과는 data/coupang-deals-cache.json 에
// 검색어별로 보관해 7일 안에는 다시 부르지 않음.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from './lib.mjs';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? (argv[i + 1] ?? true) : def; };
const MAX_CALLS = +flag('--max', 6);
const FORCE = argv.includes('--force');
const DRY = argv.includes('--dry');
const CACHE_DAYS = 7;
const DELAY_MS = 2000;
const SUB_ID = 'pxdeal';
const MIN_SAVE = 0.03; // 3% 이상 쌀 때만 "쿠팡이 더 싸다"고 표시

const env = Object.fromEntries(
  (fs.existsSync('../.env') ? fs.readFileSync('../.env', 'utf8') : '').split(/\r?\n/)
    .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]),
);
const ACCESS_KEY = env.COUPANG_ACCESS_KEY || process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = env.COUPANG_SECRET_KEY || process.env.COUPANG_SECRET_KEY;
if (!DRY && (!ACCESS_KEY || !SECRET_KEY)) { console.error('.env에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY가 필요합니다.'); process.exit(1); }

const API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/search';

async function searchProducts(keyword) {
  const query = `keyword=${encodeURIComponent(keyword)}&limit=10&subId=${SUB_ID}`;
  const datetime = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '') + 'Z';
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(datetime + 'GET' + API_PATH + query).digest('hex');
  const res = await fetch(`https://api-gateway.coupang.com${API_PATH}?${query}`, {
    headers: { Authorization: `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}` },
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = null; }
  if (res.status !== 200 || !body || body.rCode !== '0') {
    throw new Error(`HTTP ${res.status} rCode=${body?.rCode ?? '?'} ${String(body?.rMessage || text).slice(0, 100)}`);
  }
  return (body.data?.productData || []).map(p => ({
    productId: p.productId, name: p.productName, price: +p.productPrice, image: p.productImage,
    url: p.productUrl, rocket: !!p.isRocket, freeShipping: !!p.isFreeShipping, rank: p.rank,
  }));
}

// ── 쿠팡 상품명에서 총량 구하기 ──
// 쿠팡 상품명 관례: "상품명, 규격(1개 크기), 수량" 예) "햇반 백미밥, 210g, 24개" / "삼다수, 2L, 12개" / "물티슈, 100매, 10개"
// 총량 = 크기 × 수량. 애매하면(크기 2종, 수량 2종, ml·g인데 수량 표기 없음) 비교하지 않는다 —
// 잘못 계산해 "쿠팡이 싸다"고 보이는 쪽이 더 나쁘므로 보수적으로 건너뜀
const norm = s => s.toLowerCase().replace(/㎖/g, 'ml').replace(/ℓ|리터/g, 'l').replace(/㎏/g, 'kg').replace(/[×*]/g, 'x').replace(/,/g, ' ');
const SIZE_RE = /(\d+(?:\.\d+)?)\s*(ml|kg|g|l)(?![a-z])/g;
const PIECE_RE = /(\d+)\s*(매|장|롤)/g;                                   // 낱장 단위 (물티슈·키친타올·기저귀)
const COUNT_RE = /(\d+)\s*(개입|개|입|팩|봉|세트|병|캔|포|스틱|ea|box|박스)(?![a-z가-힣])/g; // 묶음 수량
const distinct = arr => [...new Map(arr.map(m => [m[1] + m[2], m])).values()];

function parseCoupangTotal(name, unitClass) {
  const s = norm(name);
  const sizes = distinct([...s.matchAll(SIZE_RE)]);
  const pieces = distinct([...s.matchAll(PIECE_RE)]);
  const counts = distinct([...s.matchAll(COUNT_RE)]).map(m => +m[1]).filter(n => n > 1); // "1개"는 묶음 아님
  if (counts.length > 1) return null;
  const count = counts[0];
  if (unitClass === 'ml' || unitClass === 'g') {
    if (sizes.length !== 1 || !count) return null; // 수량 표기가 없는 이름은 옵션(6개입 등)을 알 수 없음
    const [, n, u] = sizes[0];
    const base = u === 'l' ? +n * 1000 : u === 'kg' ? +n * 1000 : +n;
    const cls = (u === 'l' || u === 'ml') ? 'ml' : 'g';
    if (cls !== unitClass) return null;
    return base * count;
  }
  // 매 단위: "100매, 10개" → 1000매. 수량 표기가 없으면 1팩
  if (pieces.length !== 1) return null;
  return +pieces[0][1] * (count || 1);
}

const products = readJson('../public/data/products.json');
const byId = new Map(products.map(p => [p.id, p]));
const { items: candidates } = readJson('data/deal-candidates.json');
const cache = readJson('data/coupang-deals-cache.json', {});
const today = new Date().toISOString().slice(0, 10);
const stale = at => !at || (Date.now() - Date.parse(at)) > CACHE_DAYS * 86400e3;

// 1) 조회 (상한·캐시)
let calls = 0;
if (!DRY) {
  for (const c of candidates) {
    if (!FORCE && !stale(cache[c.keyword]?.fetchedAt)) continue;
    if (calls >= MAX_CALLS) { console.log(`호출 상한 ${MAX_CALLS}회 도달 — 나머지는 다음 실행에`); break; }
    try {
      calls++;
      const results = await searchProducts(c.keyword);
      cache[c.keyword] = { fetchedAt: new Date().toISOString(), results };
      writeJson('data/coupang-deals-cache.json', cache);
      console.log(`  조회 ${calls}: ${c.keyword} → ${results.length}개`);
    } catch (e) {
      console.log(`  조회 실패(${c.keyword}): ${e.message}\n  → 한도 보호를 위해 여기서 멈춥니다.`);
      break;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
}

// 2) 비교
const deals = [];
const skipped = [];
for (const c of candidates) {
  const px = byId.get(c.id);
  const entry = cache[c.keyword];
  if (!px) { skipped.push(`${c.id} PX 상품 없음(단종?)`); continue; }
  if (!entry) { skipped.push(`${c.keyword} 미조회`); continue; }
  const unitClass = c.unit === 'ml' || c.unit === 'g' ? c.unit : '매';
  const pxUnit = px.price / c.total;
  const parsed = entry.results
    .filter(r => c.must.every(m => norm(r.name).includes(norm(m))))
    .map(r => ({ r, total: parseCoupangTotal(r.name, unitClass) }))
    .filter(x => x.total && x.r.price > 0)
    .map(x => ({ ...x, unit: x.r.price / x.total }))
    .sort((a, b) => a.unit - b.unit);
  if (!parsed.length) { skipped.push(`${c.keyword}: 비교 가능한 쿠팡 상품 없음`); continue; }
  const best = parsed[0];
  const save = 1 - best.unit / pxUnit;
  if (save < MIN_SAVE) { skipped.push(`${c.keyword}: PX가 더 쌈 (PX ${pxUnit.toFixed(2)} vs 쿠팡 ${best.unit.toFixed(2)} /${c.unit})`); continue; }
  const per = unitClass === '매' ? 1 : 100;
  const u = new URL(best.r.url);
  const productId = best.r.productId || u.searchParams.get('pageKey');
  const itemId = u.searchParams.get('itemId'), vendorItemId = u.searchParams.get('vendorItemId');
  const productUrl = `https://www.coupang.com/vp/products/${productId}${itemId ? `?itemId=${itemId}${vendorItemId ? `&vendorItemId=${vendorItemId}` : ''}` : ''}`;
  deals.push({
    id: px.id, name: px.name, spec: px.spec, image: !!px.image,
    basis: `${per}${c.unit}`,
    px: { price: px.price, total: c.total, unit: c.unit, unitPrice: Math.round(pxUnit * per) },
    coupang: {
      name: best.r.name, price: best.r.price, total: best.total, unitPrice: Math.round(best.unit * per),
      productId, productUrl, affiliateUrl: best.r.url, image: best.r.image, rocket: best.r.rocket,
    },
    savePct: Math.round(save * 100),
    checkedAt: entry.fetchedAt.slice(0, 10),
  });
}
deals.sort((a, b) => b.savePct - a.savePct);

writeJson('../public/data/coupang-deals.json', { checkedAt: today, subId: SUB_ID, items: deals });
console.log(`\n쿠팡이 더 싼 대용량 ${deals.length}개 (API 호출 ${calls}회)`);
for (const d of deals) console.log(`  ${d.name}: PX ${d.px.unitPrice}원 vs 쿠팡 ${d.coupang.unitPrice}원 /${d.basis} (-${d.savePct}%) ← ${d.coupang.name}`);
if (skipped.length) console.log(`\n표시 안 함 ${skipped.length}개:\n  ` + skipped.join('\n  '));
console.log('\n→ 저장소 루트에서 커밋·푸시하면 사이트에 반영');
