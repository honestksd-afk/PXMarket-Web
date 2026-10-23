# PX MARKET

PX(군 마트) 판매상품 가격 카탈로그 — https://pxmarket-web.vercel.app

- `src/` React + Vite 앱. 상품 데이터는 `public/data/products.json` 을 불러옴
- `pipeline/` 국군복지포털 수집 → 정제·분류 → 사진·쿠팡 링크 생성. 매달 업데이트 방법은 [pipeline/README.md](pipeline/README.md)
- `api/coupang.js` 모든 쿠팡 버튼이 거치는 함수. 클릭 시점에 쿠팡 파트너스 딥링크 API로 **subId가 박힌** 링크를 만들어 이동 (Vercel 환경변수 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` 필요)

## 쿠팡 파트너스 수익 측정 (subId)

모든 쿠팡 링크에 `subId`가 붙어 파트너스 리포트 → 채널 ID(subId)에서 버튼 위치별로 클릭·수익을 볼 수 있습니다.

| subId | 위치 |
|---|---|
| `pxcard` | 상품 목록 카드의 "쿠팡" 버튼 |
| `pxdetail` | 상품 상세 시트의 쿠팡 버튼 |
| `pxlist` | 쇼핑 리스트의 "쿠팡에서 찾기" |
| `pxsearch` | 검색 결과 없음 → 쿠팡 검색 |
| `pxdrink` | 주류 상세 시트의 "쿠팡에서 ○○ 안주 보기" (술은 온라인 판매 불가 → 안주·잔 안내) |
| `pxdrinkcard` | 주류 목록 카드의 "안주" 버튼 |
| `pxdeal` | 첫 화면 "쿠팡이 더 싼 대용량" 카드 |

**유입별 측정:** 사이트 주소에 `?ref=` 를 붙여 공유하면 그 방문의 모든 링크에 꼬리표가 붙습니다.
예) 군인가족TV 영상 설명란에 `https://pxmarket-web.vercel.app/?ref=yt01` → 리포트에 `pxdetail_yt01`.
인스타 자동 DM 링크는 게시물마다 `?ref=ig1014` 처럼, 프로필 링크는 `?ref=igbio` 로 쓰는 것을 권장.
ref는 영문 소문자·숫자 12자까지. 영상·게시물마다 다르게 쓰면 어떤 콘텐츠가 매출을 냈는지 구분됩니다.

**동작 방식 (2026-10-23 수정):** 미리 만들어 둔 단축 링크(`link.coupang.com/a/xxx`) 뒤에 `?subId=`를 붙이면 쿠팡이 버려서 측정이 안 됐습니다.
지금은 모든 쿠팡 버튼이 `/api/coupang?q=상품명&sub=pxdetail_igbio&f=단축코드` 로 가고, 함수가 딥링크 API에 `subId`를 넣어 새 링크를 만든 뒤 302로 보냅니다.
같은 (대상, subId) 조합은 Vercel CDN에 7일 캐시되어 API는 조합당 1번만 호출됩니다(분당 30회 상한, 제한 응답 시 5분 중단).
API가 실패하면 `f`의 단축 링크(subId 없음)로, 그것도 없으면 일반 쿠팡 주소(수수료 없음)로 보냅니다.

## 바로가기 주소 (릴스 캡션·litt.ly·DM용)

| 주소 | 열리는 화면 |
|---|---|
| `/?view=new` | 이번 달 신규상품 탭 |
| `/?view=hot` | 인기상품 탭 |
| `/?view=drop` | 가격 인하 탭 (인하 상품이 없는 달엔 전체) |
| `/?view=stores` | 영외마트 찾기 |
| `/?q=신라면` | 검색어가 입력된 상태 (초성도 가능) |

`?ref=`와 같이 쓸 수 있습니다. 예) `https://pxmarket-web.vercel.app/?view=new&ref=ig1025`

## 방문 분석 (Vercel Web Analytics)

`@vercel/analytics`가 붙어 있습니다. **Vercel 대시보드 → 프로젝트 pxmarket-web → Analytics 탭 → Enable** 을 눌러야 수집이 시작됩니다(무료 플랜 가능).
`?ref=` 꼬리표는 `utm_source`로도 함께 기록되어 Analytics의 UTM 패널에서 유입별 방문 수를 볼 수 있습니다.
(쿠팡 클릭 같은 custom event는 Pro 플랜 전용이라 넣지 않았습니다.)

## 쿠팡이 더 싼 대용량

첫 화면의 "쿠팡이 더 싼 대용량" 띠는 `pipeline/data/deal-candidates.json`에 적은 상품을 쿠팡 상품 검색 API로 조회해 **단위가격(100g·100ml·1매당)으로 비교한 뒤 쿠팡이 3% 이상 싼 것만** 보여줍니다. 조회 기준일을 함께 표시합니다.
갱신: `pipeline`에서 `npm run deals` (자세한 것은 [pipeline/README.md](pipeline/README.md)) → 커밋·푸시.

## 개발

```
npm install
npm run dev
```
