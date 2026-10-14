// "p_code 약어" 줄 목록을 overrides.json의 category로 반영
// 사용: node scripts/apply-categories.mjs data/category-fixes.txt
// 약어: 식 과 음 위 군 주 아 스 선 메 헤 향 담
import fs from 'node:fs';
import { readJson, writeJson } from './lib.mjs';

const ABBR = {
  식: '식품·건강기능식품', 과: '과자·간식', 음: '유제품·음료', 위: '위생·생활용품', 군: '군장·피복', 주: '주류',
  아: '아이스크림', 스: '스킨케어', 선: '선케어', 메: '메이크업', 헤: '헤어케어', 향: '향수·바디', 담: '담배',
};
const overrides = readJson('data/overrides.json', {});
let n = 0;
for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const tokens = line.replace(/#.*/, '').trim().split(/\s+/).filter(Boolean);
  // 한 줄에 "id 약어" 쌍을 여러 개 써도 됨
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const [id, a] = [tokens[i], tokens[i + 1]];
    if (!ABBR[a]) throw new Error(`알 수 없는 약어 "${a}" (id ${id})`);
    (overrides[id] ??= {}).category = ABBR[a];
    n++;
  }
}
writeJson('data/overrides.json', overrides);
console.log(`카테고리 ${n}건 반영`);
