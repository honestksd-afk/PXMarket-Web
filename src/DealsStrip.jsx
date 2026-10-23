import { ExternalLink, Rocket, Info } from 'lucide-react';
import { dealUrl } from './catalog.js';
import { PARTNERS_NOTICE } from './ProductSheet.jsx';

const fmtDate = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/**
 * '쿠팡이 더 싼 대용량' — pipeline `npm run deals` 가 쿠팡 검색 API 가격을 PX 가격과 단위가격으로
 * 비교해 쿠팡이 싼 것만 public/data/coupang-deals.json 에 둔다. 조회 기준일을 함께 표시한다.
 */
export default function DealsStrip({ deals }) {
  if (!deals?.items?.length) return null;
  return (
    <section aria-label="쿠팡이 더 싼 대용량" className="-mx-6 px-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-black text-slate-400 tracking-widest flex items-center gap-2">🧾 쿠팡이 더 싼 대용량</h2>
        <span className="text-[10px] font-bold text-slate-300">{fmtDate(deals.checkedAt)} 쿠팡 가격 기준</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {deals.items.map(d => (
          <a
            key={d.id}
            href={dealUrl(d)}
            target="_blank"
            rel="noopener sponsored"
            className="snap-start flex-shrink-0 w-[232px] bg-white rounded-2xl border border-orange-100 shadow-sm p-3 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2 mb-2">
              {d.image
                ? <img src={`/images/p/${d.id}.webp`} alt="" width={40} height={40} loading="lazy" className="w-10 h-10 object-contain rounded-xl border border-slate-100" />
                : <div className="w-10 h-10 rounded-xl bg-slate-50" />}
              <div className="min-w-0">
                <p className="text-[12px] font-black text-slate-800 truncate">{d.name}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate">PX {d.spec}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-center">
              <div className="rounded-xl bg-slate-50 py-1.5">
                <p className="text-[9px] font-bold text-slate-400">PX · {d.basis}당</p>
                <p className="text-[13px] font-black text-slate-700">{d.px.unitPrice.toLocaleString()}원</p>
              </div>
              <div className="rounded-xl bg-orange-50 py-1.5">
                <p className="text-[9px] font-bold text-orange-400">쿠팡 · {d.basis}당</p>
                <p className="text-[13px] font-black text-orange-600">{d.coupang.unitPrice.toLocaleString()}원</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-2 truncate">{d.coupang.name}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-bold text-slate-400">
                {d.coupang.price.toLocaleString()}원 / {d.coupang.total.toLocaleString()}{d.px.unit}
                {d.coupang.rocket && <Rocket size={10} className="inline ml-1 text-blue-500" aria-label="로켓배송" />}
              </span>
              <span className="text-[11px] font-black text-orange-500 flex items-center gap-0.5">-{d.savePct}% <ExternalLink size={11} /></span>
            </div>
          </a>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed px-1 flex items-start gap-1">
        <Info size={11} className="mt-px flex-shrink-0" />
        쿠팡 가격은 조회일 기준이고 배송비·쿠폰·멤버십은 뺀 값이에요. 지금 가격은 쿠팡에서 꼭 확인하세요. {PARTNERS_NOTICE}
      </p>
    </section>
  );
}
