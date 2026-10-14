// 포털 상품 사진을 내려받아 public/images/p/{p_code}.webp 로 저장 (이미 있는 사진은 건너뜀)
// 사용: pipeline 폴더에서 npm run images
// - 240px 정사각 안에 맞춰 축소, WebP 변환, EXIF 등 메타데이터 제거
// - 같은 사진(포털의 "이미지 없음" 대체 이미지 등)이 여러 상품에 쓰이면 리포트에 표시
// 사진을 받은 뒤 npm run build 를 다시 돌리면 products.json 에 image 표시가 붙음
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readJson } from './lib.mjs';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

const OUT = '../public/images/p';
const SIZE = 240;
const CONCURRENCY = 4;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

fs.mkdirSync(OUT, { recursive: true });
const products = readJson('../public/data/products.json');
const todo = products.filter(p => !fs.existsSync(`${OUT}/${p.id}.webp`));
console.log(`사진 ${products.length - todo.length}개 있음 · ${todo.length}개 받기 시작`);

const hashes = new Map();
const failed = [];
let done = 0;

async function fetchOne(p) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`https://www.welfare.mil.kr/shop/imgView.do?p_code=${p.id}&type=1`, {
        headers: { 'User-Agent': UA, Referer: 'https://www.welfare.mil.kr/' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const hash = crypto.createHash('md5').update(buf).digest('hex');
      hashes.set(hash, [...(hashes.get(hash) || []), p.id]);
      await sharp(buf)
        .rotate() // EXIF 방향 반영 후 메타데이터는 버림
        .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(`${OUT}/${p.id}.webp`);
      return;
    } catch (e) {
      if (attempt === 3) failed.push(`${p.id} ${p.name}: ${e.message}`);
      else await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    await fetchOne(queue.shift());
    if (++done % 200 === 0) console.log(`  ${done}/${todo.length}`);
    await new Promise(r => setTimeout(r, 100));
  }
}));

const dupes = [...hashes.values()].filter(ids => ids.length >= 5);
console.log(`완료: 성공 ${todo.length - failed.length} · 실패 ${failed.length}`);
if (failed.length) console.log('실패:\n  ' + failed.join('\n  '));
if (dupes.length) console.log('같은 사진을 쓰는 상품 묶음(대체 이미지일 수 있음):\n  ' + dupes.map(ids => `${ids.length}개: ${ids.slice(0, 5).join(', ')}…`).join('\n  '));
