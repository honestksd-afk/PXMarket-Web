/* global process */
// GET /api/coupang?q=검색어  →  쿠팡 파트너스 딥링크(검색 결과 페이지)로 302 이동
// 사이트에 없는 상품을 검색했을 때 쓰는 링크. 키는 Vercel 환경변수 COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY
import crypto from 'node:crypto';

const API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
const cache = new Map(); // 같은 인스턴스 안에서 같은 검색어 재사용

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
    // subId: 파트너스 리포트에서 버튼 위치·유입별로 따로 볼 수 있음 (src/catalog.js subId 참고)
    body: JSON.stringify({ coupangUrls: [url], subId }),
  });
  const data = await res.json();
  return data?.rCode === '0' ? data.data?.[0]?.shortenUrl || null : null;
}

export default async function handler(req, res) {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const sub = String(req.query.sub || 'pxsearch').replace(/[^a-z0-9_]/gi, '').slice(0, 30) || 'pxsearch';
  const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`;
  if (!q) return res.redirect(302, 'https://www.coupang.com/');

  const key = q + '|' + sub;
  let target = cache.get(key);
  if (!target) {
    try { target = await deeplink(searchUrl, sub); } catch { target = null; }
    if (target) cache.set(key, target);
  }
  // 키가 없거나 API 오류면 일반 검색으로라도 보냄 (이 경우 수수료는 없음)
  res.setHeader('Cache-Control', 'no-store');
  return res.redirect(302, target || searchUrl);
}
