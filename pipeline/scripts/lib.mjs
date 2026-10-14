import fs from 'node:fs';

/** 포털에서 저장한 CSV(따옴표 감싼 필드) 파싱 */
export function readCsv(path) {
  const text = fs.readFileSync(path, 'utf8').replace(/^﻿/, '');
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.length > 1);
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/** 비교용 이름 정규화: (영외) 등 괄호 접두어, 공백, 특수문자 제거 */
export const norm = s => s.toLowerCase().replace(/^\((영외|영내)\)\s*/, '').replace(/[\s()\[\]_\-·.,/*+]/g, '');

/** 문자 bigram 유사도 (0~1) */
export function similarity(a, b) {
  const grams = s => { const g = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); g.set(k, (g.get(k) || 0) + 1); } return g; };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  for (const [k, v] of ga) inter += Math.min(v, gb.get(k) || 0);
  const total = Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0);
  return total ? (2 * inter) / total : (a === b ? 1 : 0);
}

export const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);
export const writeJson = (p, v, pretty = true) => fs.writeFileSync(p, JSON.stringify(v, null, pretty ? 1 : 0) + '\n');
