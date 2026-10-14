# PX MARKET

PX(군 마트) 판매상품 가격 카탈로그 — https://pxmarket-web.vercel.app

- `src/` React + Vite 앱. 상품 데이터는 `public/data/products.json` 을 불러옴
- `pipeline/` 국군복지포털 수집 → 정제·분류 → 사진·쿠팡 링크 생성. 매달 업데이트 방법은 [pipeline/README.md](pipeline/README.md)
- `api/coupang.js` 검색어 → 쿠팡 파트너스 딥링크로 이동 (Vercel 환경변수 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` 필요)

## 쿠팡 파트너스 수익 측정 (subId)

모든 쿠팡 링크에 `subId`가 붙어 파트너스 리포트에서 버튼 위치별로 클릭·수익을 볼 수 있습니다.

| subId | 위치 |
|---|---|
| `pxcard` | 상품 목록 카드의 "쿠팡" 버튼 |
| `pxdetail` | 상품 상세 시트의 쿠팡 버튼 |
| `pxlist` | 쇼핑 리스트의 "쿠팡에서 찾기" |
| `pxsearch` | 검색 결과 없음 → 쿠팡 검색 |

**유입별 측정:** 사이트 주소에 `?ref=` 를 붙여 공유하면 그 방문의 모든 링크에 꼬리표가 붙습니다.
예) 군인가족TV 영상 설명란에 `https://pxmarket-web.vercel.app/?ref=yt01` → 리포트에 `pxdetail_yt01`.
ref는 영문 소문자·숫자 12자까지. 영상·게시물마다 다르게 쓰면 어떤 콘텐츠가 매출을 냈는지 구분됩니다.

## 개발

```
npm install
npm run dev
```
