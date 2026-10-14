// 상품 데이터 로딩·검색 유틸 (데이터는 pipeline/에서 생성한 public/data/*.json)

export const PARTNERS_ID = "cmyTxY";

export const CATEGORY_ORDER = [
  '식품·건강기능식품', '과자·간식', '유제품·음료', '아이스크림', '주류',
  '스킨케어', '선케어', '메이크업', '헤어케어', '향수·바디',
  '위생·생활용품', '군장·피복', '담배',
];

export const CAT_EMOJI = {
  '전체': '🛒',
  '주류': '🍷',
  '유제품·음료': '🥛',
  '스킨케어': '✨',
  '선케어': '☀️',
  '메이크업': '💄',
  '헤어케어': '💇',
  '향수·바디': '🌸',
  '위생·생활용품': '🧴',
  '아이스크림': '🍦',
  '과자·간식': '🍪',
  '식품·건강기능식품': '🍱',
  '군장·피복': '🎖️',
  '담배': '🚬',
};

export async function loadCatalog() {
  const [products, meta] = await Promise.all([
    fetch('/data/products.json').then(r => r.json()),
    fetch('/data/meta.json').then(r => r.json()),
  ]);
  for (const p of products) p._search = searchKey(p.name + ' ' + p.company);
  return { products, meta };
}

// 구버전(상품 550개, 숫자 id) 쇼핑 리스트를 p_code 기준으로 변환
export async function migrateLegacyCart(cart) {
  const keys = Object.keys(cart);
  if (!keys.length || !keys.some(k => Number(k) <= 550)) return cart;
  const map = await fetch('/data/legacy-ids.json').then(r => r.json()).catch(() => ({}));
  const next = {};
  for (const [k, qty] of Object.entries(cart)) {
    const id = Number(k) <= 550 ? map[k] : k;
    if (id) next[id] = (next[id] || 0) + qty;
  }
  return next;
}

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

// 한글 음절 → 초성 문자열 ("신라면" → "ㅅㄹㅁ")
function chosung(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    out += code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch;
  }
  return out;
}

const compact = s => s.toLowerCase().replace(/[\s()[\]_\-·.,/*+]/g, '');

/** 검색용 키: 공백 없는 원문 + 초성 */
export function searchKey(s) {
  const c = compact(s);
  return c + '\n' + chosung(c);
}

/** 공백 무시 부분일치. 키에 초성 줄도 들어 있어 "ㅅㄹㅁ" 같은 초성 검색도 걸림 */
export function matches(item, query) {
  const q = compact(query);
  if (!q) return true;
  return item._search.includes(q);
}

export function coupangUrl(item) {
  if (!('link' in item)) return null; // 주류·담배: 쿠팡 판매 불가
  return item.link || `https://link.coupang.com/a/${PARTNERS_ID}?q=${encodeURIComponent(item.name)}`;
}
