// 국군복지포털 마트 판매상품 전체 수집기
// 사용법:
//   1. Chrome에서 국군복지포털 로그인
//   2. 마트/쇼핑타운 > 마트 판매상품 페이지로 이동
//   3. F12 → Console 탭에 이 파일 내용을 통째로 붙여넣고 Enter
//   4. 1~2분 뒤 px_all_YYYYMMDD.csv 가 다운로드됨 → pxmarket-data/raw/ 로 옮기기
// 포털 부담을 줄이려고 페이지마다 0.3초씩 쉬어 갑니다.
(async () => {
  const base = '/content/content.do?m_code=114&type=user&paging_num=10&c_parent=0&c_depth=null&c_codex=&p_open_dt=';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function page(newOnly, pg) {
    const html = await fetch(base + (newOnly ? 'Y' : '') + '&pg=' + pg).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('table tbody tr')].map(tr => {
      const c = [...tr.cells];
      const m = (c[3]?.querySelector('a')?.getAttribute('href') || '').match(/p_code=(\d+)/);
      return m && { p_code: m[1], company: c[2].innerText.trim(), name: c[3].innerText.trim(), spec: c[4].innerText.trim(), price: c[5].innerText.replace(/[^\d]/g, '') };
    }).filter(Boolean);
  }

  async function all(newOnly) {
    const out = [], seen = new Set();
    for (let pg = 1; pg <= 200; pg++) {
      // 마지막 페이지를 넘기면 빈 표 또는 이미 본 상품이 나오므로 거기서 멈춤
      const rows = (await page(newOnly, pg)).filter(r => !seen.has(r.p_code));
      if (!rows.length) break;
      rows.forEach(r => seen.add(r.p_code));
      out.push(...rows);
      console.log(`${newOnly ? '신규' : '전체'} ${pg}페이지 · 누적 ${out.length}개`);
      await sleep(300);
    }
    return out;
  }

  const rows = await all(false);
  if (!rows.length) return alert('상품을 찾지 못했습니다. 로그인 상태와 페이지를 확인하세요.');
  const newIds = new Set((await all(true)).map(r => r.p_code));

  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const csv = '﻿p_code,company,name,spec,price,new2026\n' +
    rows.map(r => [r.p_code, r.company, r.name, r.spec, r.price, newIds.has(r.p_code) ? 'Y' : ''].map(q).join(',')).join('\n');
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
    download: `px_all_${stamp}.csv`,
  });
  document.body.appendChild(a); a.click(); a.remove();
  console.log(`완료: 전체 ${rows.length}개 (신규 ${newIds.size}개) → px_all_${stamp}.csv`);
})();
