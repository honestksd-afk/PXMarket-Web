// 포털 CSV → (저장소 루트) public/data/products.json + meta.json + 변경 리포트
// 사용: pipeline 폴더에서 npm run build -- raw/px_all_YYYYMMDD.csv
//
// 입력 (pipeline 폴더 기준)
//   raw/px_all_*.csv          포털에서 수집한 원본 (p_code, company, name, spec, price, new2026) — git 제외
//   data/overrides.json       수동 수정 (p_code → { category, name, link, hot, hidden, allowLink })
//   data/category-rules.json  상품명 키워드 → 카테고리 규칙
//   data/history.json         이전 빌드 기록 (p_code → { firstSeen, lastSeen, price, prevPrice })
//   data/legacy-ids.json      구버전(550개) 상품 번호 → p_code. 저장된 쇼핑 리스트 이전용
// 출력
//   ../public/data/products.json, meta.json, legacy-ids.json
//   reports/YYYYMMDD.md       신규·가격변동·단종 리포트
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, readJson, writeJson } from './lib.mjs';

const csvPath = path.resolve(process.argv[2] || '');
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const OUT = '../public/data';

if (!process.argv[2]) { console.error('사용법: node scripts/build.mjs raw/px_all_YYYYMMDD.csv'); process.exit(1); }
const stamp = (path.basename(csvPath).match(/(\d{8})/) || [])[1];
if (!stamp) { console.error('파일명에 날짜(YYYYMMDD)가 있어야 합니다.'); process.exit(1); }
const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;

const rows = readCsv(csvPath);
const overrides = readJson('data/overrides.json', {});
const { rules } = readJson('data/category-rules.json');
const history = readJson('data/history.json', {});

// 쿠팡에서 팔 수 없는 카테고리 (주류 온라인 판매 금지, 담배). 전통주 등 예외는 overrides에 allowLink: true
const NO_COUPANG = new Set(['주류', '담배']);

function classify(name) {
  for (const r of rules) if (r.keywords.some(k => name.includes(k))) return r.category;
  return '기타';
}

// 최초 빌드일. 이 날짜에 처음 본 상품은 "신규"가 아니라 기준 데이터
const baselineDate = Object.values(history).reduce((min, h) => (h.firstSeen < min ? h.firstSeen : min), date);

const products = [];
const seen = new Set();
for (const r of rows) {
  const id = r.p_code;
  if (!id || seen.has(id)) continue;
  seen.add(id);
  const o = overrides[id] || {};
  if (o.hidden) continue;

  const rawName = r.name.trim();
  // "(영외)"는 이름 중간(규격(250047)(영외)...)이나 괄호 없이("영외)...") 붙기도 함
  const outsideOnly = /\(?영외\)/.test(rawName);
  const company = r.company.replace(/-면세$/, '').trim();
  const dutyFree = /-면세$/.test(r.company) || /\(면세\)/.test(rawName);
  const name = o.name || rawName.replace(/\(?영외\)\s*/g, '').replace(/\(면세\)/g, '').trim();
  const price = +r.price;
  const category = o.category || classify(name);

  const h = history[id];
  const prevPrice = h && h.price !== price ? h.price : h?.prevPrice;
  history[id] = {
    firstSeen: h?.firstSeen || date,
    lastSeen: date,
    price,
    ...(prevPrice !== undefined && prevPrice !== price ? { prevPrice, priceChanged: h && h.price !== price ? date : h.priceChanged } : {}),
  };

  products.push({
    id, name, company, spec: r.spec.trim(), price, category,
    ...(r.new2026 === 'Y' && { isNew: true }),
    ...(outsideOnly && { outsideOnly: true }),
    ...(dutyFree && { dutyFree: true }),
    ...(o.hot && { hot: true }),
    ...(history[id].prevPrice !== undefined && { prevPrice: history[id].prevPrice }),
    firstSeen: history[id].firstSeen,
    ...(fs.existsSync(`../public/images/p/${id}.webp`) && { image: true }), // npm run images 로 받은 사진
    ...(!NO_COUPANG.has(category) || o.allowLink ? { link: o.link || null } : {}),
  });
}

// 이번 수집에 없는 상품 = 단종(포털에서 내려감)
// 같은 날짜로 다시 빌드해도 결과가 같도록, 이번 날짜에 표시된 항목은 그대로 집계
for (const [id, h] of Object.entries(history)) if (!seen.has(id) && !h.removed) h.removed = date;
const removed = Object.entries(history).filter(([, h]) => h.removed === date);

const added = date === baselineDate ? [] : products.filter(p => p.firstSeen === date);
const changed = products.filter(p => history[p.id].priceChanged === date);

// 출력
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync('reports', { recursive: true });
products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || a.category.localeCompare(b.category, 'ko') || a.name.localeCompare(b.name, 'ko'));
writeJson(`${OUT}/products.json`, products, false);
fs.copyFileSync('data/legacy-ids.json', `${OUT}/legacy-ids.json`);

const byCategory = {};
for (const p of products) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
const meta = {
  version: stamp,
  updatedAt: date,
  total: products.length,
  newCount: products.filter(p => p.isNew).length,
  byCategory,
  changes: { added: added.length, priceChanged: changed.length, removed: removed.length },
};
writeJson(`${OUT}/meta.json`, meta);
writeJson('data/history.json', history);

const won = n => n.toLocaleString('ko-KR') + '원';
const report = [
  `# PX 데이터 업데이트 리포트 — ${date}`,
  '',
  `- 전체 ${meta.total}개 (2026 신규 ${meta.newCount}개)`,
  `- 신규 등록 ${added.length} · 가격 변동 ${changed.length} · 단종 ${removed.length}`,
  `- 미분류(기타) ${byCategory['기타'] || 0}개 → data/overrides.json에 category 지정 필요`,
  '',
  '## 카테고리별', ...Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`),
  '', '## 신규 등록', ...added.map(p => `- [${p.id}] ${p.name} (${p.category}) ${won(p.price)}`),
  '', '## 가격 변동', ...changed.map(p => `- [${p.id}] ${p.name}: ${won(p.prevPrice)} → ${won(p.price)}`),
  '', '## 단종', ...removed.map(([id, h]) => `- [${id}] 마지막 확인 ${h.lastSeen}, ${won(h.price)}`),
  '', '## 미분류', ...products.filter(p => p.category === '기타').map(p => `- [${p.id}] ${p.name} / ${p.company}`),
].join('\n');
fs.writeFileSync(`reports/${stamp}.md`, report + '\n');

const kb = (fs.statSync(`${OUT}/products.json`).size / 1024).toFixed(0);
console.log(`완료: ${meta.total}개 (${kb}KB) · 신규 ${added.length} · 가격변동 ${changed.length} · 단종 ${removed.length} · 미분류 ${byCategory['기타'] || 0}`);
console.log(`리포트: reports/${stamp}.md`);
