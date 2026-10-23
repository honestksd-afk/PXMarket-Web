/* global process */
// GET /api/coupang?q=검색어|u=쿠팡주소&sub=subId&f=대체링크  →  쿠팡 파트너스 딥링크로 302 이동
//
// 쿠팡 단축 링크(link.coupang.com/a/xxx) 뒤에 ?subId= 를 붙이면 쿠팡이 버리기 때문에,
// 클릭 시점에 딥링크 API로 "subId가 박힌" 링크를 새로 만들어 보낸다. 같은 (대상, subId) 조합은
// Vercel CDN에 7일 캐시 + 인스턴스 메모리 캐시 → API 호출은 조합당 사실상 1번.
//
//   q   = 쿠팡 검색어 (상품명)                  → https://www.coupang.com/np/search?q=
//   u   = 쿠팡 상품·검색 페이지 주소 (coupang.com 도메인만 허용)
//   sub = subId. 버튼 위치 + 유입 꼬리표 (예: pxdetail_igbio). src/catalog.js subId() 참고
//   f   = API 실패 시 대체 링크: 단축 코드(link.coupang.com/a/<코드>) 또는 link.coupang.com 전체 주소
//
// 키는 Vercel 환경변수 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 만. 코드·로그에 키를 남기지 않는다.
import crypto from 'node:crypto';

const API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
const COUPANG_HOSTS = new Set(['www.coupang.com', 'm.coupang.com', 'coupang.com', 'pages.coupang.com']);
const OK_CACHE = 'public, s-maxage=604800, stale-while-revalidate=86400'; // 성공한 302는 CDN 7일
const SUB_DEFAULT = 'pxsearch';

// 인스턴스 메모리 캐시: key(대상|sub) → 단축 링크
const cache = new Map();
const CACHE_MAX = 3000;

// 호출 보호: 분당 상한 + 제한 응답(403/429) 뒤 잠시 중단. 넘치면 대체 링크로 보낸다
const PER_MINUTE = 30;
const COOLDOWN_MS = 5 * 60 * 1000;
let windowStart = 0, windowCalls = 0, blockedUntil = 0;

function canCall() {
  const now = Date.now();
  if (now < blockedUntil) return false;
  if (now - windowStart > 60_000) { windowStart = now; windowCalls = 0; }
  if (windowCalls >= PER_MINUTE) return false;
  windowCalls++;
  return true;
}

async function deeplink(url, subId) {
  const { COUPANG_ACCESS_KEY: ak, COUPANG_SECRET_KEY: sk } = process.env;
  if (!ak || !sk) return null;
  const datetime = new Date().toISOString().slice(2, 19).replace(/[-:]/g, '') + 'Z';
  const signature = crypto.createHmac('sha256', sk).update(datetime + 'POST' + API_PATH).digest('hex');
  const res = await fetch(`https://api-gateway.coupang.com${API_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `CEA algorithm=HmacSHA256, access-key=${ak}, signed-date=${datetime}, signature=${signature}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ coupangUrls: [url], subId }),
    signal: AbortSignal.timeout(4000),
  });
  if (res.status === 403 || res.status === 429) { blockedUntil = Date.now() + COOLDOWN_MS; return null; }
  const data = await res.json().catch(() => null);
  if (!data) return null;
  if (data.rCode !== '0') {
    if (/limit|exceed|too many/i.test(data.rMessage || '')) blockedUntil = Date.now() + COOLDOWN_MS;
    return null;
  }
  return data.data?.[0]?.shortenUrl || null;
}

function parseTarget(query) {
  const q = String(query.q || '').trim().slice(0, 60);
  if (q) return `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;
  try {
    const u = new URL(String(query.u || ''));
    if (u.protocol === 'https:' && COUPANG_HOSTS.has(u.hostname)) return u.toString().slice(0, 500);
  } catch { /* 주소 아님 */ }
  return null;
}

function parseFallback(f) {
  const s = String(f || '').trim();
  if (/^[A-Za-z0-9]{2,24}$/.test(s)) return `https://link.coupang.com/a/${s}`;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' && u.hostname === 'link.coupang.com') return u.toString().slice(0, 600);
  } catch { /* 없음 */ }
  return null;
}

export default async function handler(req, res) {
  const target = parseTarget(req.query);
  if (!target) { res.setHeader('Cache-Control', 'no-store'); return res.redirect(302, 'https://www.coupang.com/'); }
  const sub = String(req.query.sub || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || SUB_DEFAULT;
  const fallback = parseFallback(req.query.f) || target; // 대체 링크가 없으면 일반 주소 (수수료 없음)

  const key = target + '|' + sub;
  let link = cache.get(key);
  if (!link && canCall()) {
    try { link = await deeplink(target, sub); } catch { link = null; }
    if (link) {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, link);
    }
  }

  // 성공: CDN이 같은 주소의 다음 클릭을 함수 호출 없이 바로 보냄. 실패: 캐시하지 않아 다음 클릭에 다시 시도
  res.setHeader('Cache-Control', link ? OK_CACHE : 'no-store');
  return res.redirect(302, link || fallback);
}
