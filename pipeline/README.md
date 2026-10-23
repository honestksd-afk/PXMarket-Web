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
6. 새 상품 사진 받기: `npm run images` (이미 받은 사진은 건너뜀)
7. 새 상품 쿠팡 전용 링크 만들기: `npm run links` (저장소 루트 .env의 쿠팡 API 키 사용)
8. 6·7번을 했으면 3번 빌드를 한 번 더 → 저장소 루트에서 커밋·푸시하면 Vercel이 자동 배포
9. (선택) '쿠팡이 더 싼 대용량' 갱신: `npm run deals` — 아래 참고

> 같은 날짜 CSV로 빌드를 다시 돌려도 결과는 같습니다. 신규·가격변동은 "이전 날짜 빌드"와 비교합니다.

## 쿠팡이 더 싼 대용량 (`npm run deals`)

`data/deal-candidates.json` 의 상품(PX p_code, 쿠팡 검색어, 상품명에 꼭 들어가야 할 말, PX 1개의 총량)을
쿠팡 파트너스 **상품 검색 API**로 조회해 단위가격을 비교하고, 쿠팡이 3% 이상 싼 것만
`../public/data/coupang-deals.json` 에 저장합니다(사이트 첫 화면 띠, 조회 기준일 표시).

- 검색 API는 호출 한도가 빡빡하다고 알려져 있어(시간당 10회 안팎 보고) **한 번에 최대 6회**만 부르고, 오류가 나면 즉시 멈춥니다.
  `--max 10` 으로 상한 조정, `--force` 로 캐시 무시, `--dry` 로 API 없이 캐시만 비교.
- 조회 결과는 `data/coupang-deals-cache.json` 에 검색어별로 7일 보관 → 여러 번 나눠 실행하면 후보 전체가 채워집니다.
- 쿠팡 상품명에서 총량을 읽을 수 없으면(수량 표기 없음, 규격 2종 등) 비교하지 않습니다. 잘못 계산해 "쿠팡이 싸다"고 보이는 쪽이 더 나쁘기 때문입니다.
- 후보를 추가할 때는 PX 상품의 총량(`total`, `unit`: ml·g·매)을 규격을 보고 직접 적으세요. 예) `2l*6pet` → 12000 ml.

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
| `../public/images/p/{p_code}.webp` | 상품 사진 (240px WebP, 메타데이터 제거) |
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
- `image` = 사진 파일이 있음 (없으면 카테고리 이모지 표시)
- `link`: 문자열 = 전용 쿠팡 링크, `null` = 쿠팡 검색 링크로 대체, 필드 없음 = 쿠팡 버튼 숨김(주류·담배)
