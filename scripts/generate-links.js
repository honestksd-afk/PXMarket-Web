/**
 * 쿠팡 파트너스 딥링크 API로 상품별 제휴 링크를 일괄 생성
 * 사용법: node scripts/generate-links.js
 */
import 'dotenv/config';
import crypto from 'crypto';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('.env 파일에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY를 설정하세요.');
  process.exit(1);
}

// --- HMAC 서명 (쿠팡 공식 형식) ---
function callDeeplinkApi(urls) {
  const datetime = new Date().toISOString().substr(2, 17).replace(/[-:]/g, '') + 'Z';
  const method = 'POST';
  const apiPath = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
  const message = datetime + method + apiPath;
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(message).digest('hex');
  const authorization = `CEA algorithm=HmacSHA256, access-key=${ACCESS_KEY}, signed-date=${datetime}, signature=${signature}`;

  return fetch(`https://api-gateway.coupang.com${apiPath}`, {
    method,
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ coupangUrls: urls }),
  }).then(r => r.json());
}

// --- 메인 ---
async function main() {
  // 1. 엑셀 읽기
  const wb = XLSX.readFile(path.join(ROOT, 'PX_2026신규상품_전체.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const items = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    items.push({
      id: row[0],
      cat: row[1] || '',
      name: row[2] || '',
      company: row[3] || '',
      spec: row[4] || '',
      px: typeof row[5] === 'number' ? row[5] : parseInt(String(row[5]).replace(/,/g, '')) || 0,
      hot: false,
      link: '',
    });
  }

  console.log(`총 ${items.length}개 상품 딥링크 생성 시작...\n`);

  // 2. 배치 처리 (한 번에 10개씩)
  const BATCH_SIZE = 10;
  let success = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const urls = batch.map(item =>
      `https://www.coupang.com/np/search?q=${encodeURIComponent(item.name + ' ' + item.spec)}`
    );

    process.stdout.write(`[${i + 1}-${Math.min(i + BATCH_SIZE, items.length)}/${items.length}] `);

    try {
      const result = await callDeeplinkApi(urls);
      if (result.rCode === '0' && result.data) {
        for (let j = 0; j < result.data.length; j++) {
          batch[j].link = result.data[j].shortenUrl || '';
          if (batch[j].link) success++;
          else fail++;
        }
        console.log('OK');
      } else {
        console.log('API 오류:', result.rMessage || 'unknown');
        fail += batch.length;
      }
    } catch (e) {
      console.log('요청 실패:', e.message);
      fail += batch.length;
    }

    // API 속도 제한 방지
    await new Promise(r => setTimeout(r, 500));
  }

  // 3. data.js 저장
  const output = [
    `// PX마켓 2026 신규상품 전체 데이터 (${items.length}개)`,
    `// 쿠팡 파트너스 제휴 링크 자동 생성: ${new Date().toLocaleDateString('ko-KR')}`,
    `export const RAW_DATA = ${JSON.stringify(items, null, 2)};`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'src', 'data.js'), output, 'utf8');

  console.log(`\n완료! 성공: ${success}, 실패: ${fail}`);
  console.log('src/data.js 저장됨');
}

main().catch(console.error);
