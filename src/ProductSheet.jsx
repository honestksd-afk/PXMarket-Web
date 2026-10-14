import { useEffect } from 'react';
import { X, Heart, MapPin, ExternalLink, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { CAT_EMOJI, coupangUrl } from './catalog.js';

export const PARTNERS_NOTICE = '쿠팡 파트너스 활동으로 구매 시 일정액의 수수료를 받을 수 있어요. 구매 가격은 같아요.';

/** 쿠팡 이동 버튼 + 바로 아래 파트너스 고지 (고지는 링크 가까이에 있어야 함) */
export function CoupangCta({ url, label = '쿠팡에서 찾아보기', sub, compact = false }) {
  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener sponsored"
        className={`flex items-center justify-center gap-2 w-full rounded-2xl bg-orange-500 text-white font-black active:scale-[0.98] transition-transform shadow-lg shadow-orange-200 ${compact ? 'py-3 text-sm' : 'py-4 text-[15px]'}`}
      >
        {label} <ExternalLink size={compact ? 14 : 16} />
      </a>
      {sub && <p className="text-[11px] text-slate-500 font-bold text-center mt-2">{sub}</p>}
      <p className="text-[10px] text-slate-400 text-center mt-1 leading-relaxed">{PARTNERS_NOTICE}</p>
    </div>
  );
}

/** 상품 상세 바텀시트 — 카드를 누르면 열림 */
export default function ProductSheet({ item, meta, inCart, onToggleCart, onClose, onFindStore }) {
  // 휴대폰 뒤로가기로 닫히도록
  useEffect(() => {
    window.history.pushState({ sheet: item.id }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [item.id, onClose]);

  const close = () => window.history.back(); // popstate → onClose
  const url = coupangUrl(item);
  const diff = item.prevPrice ? item.price - item.prevPrice : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={item.name}
        className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} aria-label="닫기" className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 text-slate-400 hover:text-slate-700">
          <X size={20} />
        </button>

        {/* 사진 */}
        <div className="h-56 bg-slate-50 flex items-center justify-center rounded-t-3xl">
          {item.image
            ? <img src={`/images/p/${item.id}.webp`} alt={item.name} className="h-48 w-48 object-contain" />
            : <span className="text-7xl">{CAT_EMOJI[item.category] || '📦'}</span>}
        </div>

        <div className="p-6 space-y-5">
          {/* 기본 정보 */}
          <div>
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{item.category}</span>
              {item.isNew && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">2026 신규</span>}
              {item.hot && <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">인기</span>}
              {item.dutyFree && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">면세</span>}
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-snug">{item.name}</h2>
            <p className="text-xs text-slate-400 font-bold mt-1">{item.spec} · {item.company}</p>
          </div>

          {/* 가격 */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-black text-slate-400">PX가</span>
              <span className="text-2xl font-black text-slate-900">{item.price.toLocaleString()}원</span>
            </div>
            {diff !== 0 && (
              <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${diff < 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                {diff < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                직전 조사 {item.prevPrice.toLocaleString()}원 → {Math.abs(diff).toLocaleString()}원 {diff < 0 ? '인하' : '인상'}
              </p>
            )}
            <p className="text-[10px] text-slate-400 mt-2 flex items-start gap-1">
              <Info size={11} className="mt-px flex-shrink-0" />
              {meta ? `${meta.updatedAt} 국군복지포털 기준 가격이에요. ` : ''}매장별 실제 가격·재고는 다를 수 있어요.
            </p>
          </div>

          {/* 어디서 사나 */}
          <div className="space-y-2">
            {item.outsideOnly && (
              <p className="text-xs font-bold text-slate-600 bg-amber-50 rounded-xl px-3 py-2">
                📍 영외마트 전용 상품이에요. 부대 안 PX에서는 판매하지 않을 수 있어요.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onToggleCart}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black transition-colors ${inCart ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}
              >
                <Heart size={14} fill={inCart ? 'currentColor' : 'none'} /> {inCart ? '리스트에 담김' : 'PX 쇼핑 리스트에 담기'}
              </button>
              <button
                onClick={onFindStore}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-black bg-slate-100 text-slate-600"
              >
                <MapPin size={14} /> 영외마트 찾기
              </button>
            </div>
          </div>

          {/* 쿠팡 */}
          {url ? (
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-black text-slate-800 mb-1">PX에 없거나 갈 시간이 없다면?</p>
              <p className="text-xs text-slate-500 mb-3">품절이거나 부대·마트가 멀 때는 쿠팡에서 같은 상품을 찾아 집으로 받을 수 있어요.</p>
              <CoupangCta url={url} />
            </div>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-3 border-t border-slate-100">
              {item.category === '담배' ? '담배' : '주류'}는 온라인 판매가 안 돼서 PX 매장에서만 살 수 있어요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
