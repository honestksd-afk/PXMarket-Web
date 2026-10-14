// 상품 데이터 로딩·검색 유틸 (데이터는 pipeline/에서 생성한 public/data/*.json)

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

// ── 쿠팡 파트너스 subId: 어느 버튼·어느 유입에서 수익이 났는지 파트너스 리포트에서 구분 ──
// 버튼 위치: card(목록 카드) / detail(상세 시트) / list(쇼핑 리스트) / search(검색 결과 없음)
// 유입: 사이트 주소에 ?ref=yt01 처럼 붙여 공유하면 "pxdetail_yt01" 형태로 기록됨
const REF_KEY = 'px-ref';

function currentRef() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('ref');
    const ref = (fromUrl || sessionStorage.getItem(REF_KEY) || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (fromUrl && ref) sessionStorage.setItem(REF_KEY, ref);
    return ref;
  } catch {
    return '';
  }
}

export function subId(placement) {
  const ref = currentRef();
  return `px${placement}${ref ? `_${ref}` : ''}`;
}

export function coupangUrl(item, placement = 'card') {
  if (!('link' in item)) return null; // 주류·담배: 쿠팡 판매 불가
  if (!item.link) return coupangSearchUrl(item.name, placement);
  return `${item.link}${item.link.includes('?') ? '&' : '?'}subId=${subId(placement)}`;
}

/** 쿠팡 검색 링크. 서버(api/coupang.js)가 파트너스 딥링크를 만들어 이동시킴 */
export function coupangSearchUrl(query, placement = 'search') {
  return `/api/coupang?q=${encodeURIComponent(query)}&sub=${subId(placement)}`;
}
