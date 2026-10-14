# PX MARKET 데이터 파이프라인

국군복지포털 "마트 판매상품" 전체 목록 → 사이트가 불러오는 `public/data/*.json` 생성.

## 매달 업데이트 (약 10분)

1. Chrome에서 국군복지포털 로그인 → 마트/쇼핑타운 → 마트 판매상품
2. F12 → Console에 `scripts/collect-in-browser.js` 내용을 붙여넣고 Enter
   → `px_all_YYYYMMDD.csv` 다운로드 → `pipeline/raw/` 폴더로 이동 (csv는 git에 올라가지 않음)
3. `pipeline` 폴더에서 빌드
   ```
   npm run build -- raw/px_all_YYYYMMDD.csv
   ```
4. `reports/YYYYMMDD.md` 확인 — 신규 / 가격변동 / 단종 / 미분류
5. 미분류(기타)나 잘못된 분류가 있으면 `data/category-fixes.txt`에 `p_code 약어` 추가 후
   ```
   npm run categories
   ```
   그리고 3번을 다시 실행. 약어: 식 과 음 위 군 주 아 스 선 메 헤 향 담
6. 저장소 루트에서 커밋 → 푸시하면 Vercel이 자동 배포

> 같은 날짜 CSV로 빌드를 다시 돌려도 결과는 같습니다. 신규·가격변동은 "이전 날짜 빌드"와 비교합니다.

## 파일

| 경로 | 설명 |
|---|---|
| `raw/px_all_*.csv` | 포털 원본 (p_code, company, name, spec, price, new2026). git 제외 |
| `data/overrides.json` | 상품별 수동 수정: `category`, `name`(표시 이름), `link`(쿠팡 파트너스), `hot`, `hidden`, `allowLink` |
| `data/category-rules.json` | 상품명 키워드 → 카테고리 (overrides에 없을 때만 사용) |
| `data/category-fixes.txt` | 카테고리 수동 지정 목록 (`npm run categories`로 overrides에 반영) |
| `data/history.json` | 빌드 기록. 상품별 처음 본 날, 직전 가격, 단종일. **지우면 신규/가격변동 기록이 초기화됨** |
| `data/legacy-ids.json` | 구버전(550개) 상품 번호 → p_code. 사용자 쇼핑 리스트 자동 이전용 |
| `../public/data/products.json` | 사이트가 불러오는 상품 데이터 |
| `../public/data/meta.json` | 버전·업데이트일·카테고리별 개수·이번 변경 요약 |

영외마트 목록은 `src/stores.js` 에 있습니다.

## 상품 데이터 형식

```json
{"id":"20396","name":"칸쵸","company":"롯데웰푸드(주)","spec":"196g","price":1590,
 "category":"과자·간식","isNew":true,"outsideOnly":true,"dutyFree":true,"hot":true,
 "prevPrice":1670,"firstSeen":"2026-10-14","link":"https://link.coupang.com/a/..."}
```

- `id` = 포털 p_code (고정)
- `isNew` = 포털 "2026년 신규상품" 탭에 있음
- `outsideOnly` = 상품명에 (영외) 표시 / `dutyFree` = 면세
- `prevPrice` = 직전 수집 대비 가격이 바뀐 경우만
- `link`: 문자열 = 전용 쿠팡 링크, `null` = 쿠팡 검색 링크로 대체, 필드 없음 = 쿠팡 버튼 숨김(주류·담배)
