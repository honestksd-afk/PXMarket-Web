import { useEffect } from 'react';
import { X, ExternalLink, ChevronRight } from 'lucide-react';
import { COLLECTIONS } from './collections.js';
import { coupangSearchUrl } from './catalog.js';
import { PARTNERS_NOTICE } from './ProductSheet.jsx';

/** 홈 첫 화면 가로 띠: 상황별 모음 5개. 누르면 모음 시트가 열림(쿠팡으로 바로 보내지 않음) */
export function CollectionsStrip({ onOpen }) {
  return (
    <section aria-label="군인가족 상황별 모음" className="-mx-6 px-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-black text-slate-400 tracking-widest">🎒 군인가족 상황별 모음</h2>
        <span className="text-[10px] font-bold text-slate-300">쿠팡에서 집으로</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {COLLECTIONS.map(c => (
          <button
            key={c.key}
            onClick={() => onOpen(c.key)}
            className="snap-start flex-shrink-0 w-[150px] text-left bg-[#F3EEDC] rounded-2xl p-3 active:scale-[0.97] transition-transform"
          >
            <span className="text-2xl">{c.emoji}</span>
            <p className="text-[13px] font-black text-[#34452A] mt-1 leading-tight">{c.title}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1 leading-snug line-clamp-2">{c.desc}</p>
            <p className="text-[10px] font-black text-orange-500 mt-1.5 flex items-center">{c.items.length}개 보기 <ChevronRight size={11} strokeWidth={3} /></p>
          </button>
        ))}
      </div>
    </section>
  );
}

/** 모음 바텀시트 — 항목마다 쿠팡 검색 링크(subId pxset) + 고지 */
export function CollectionSheet({ collection, onClose }) {
  // 휴대폰 뒤로가기로 닫히도록 (ProductSheet 와 같은 방식)
  useEffect(() => {
    window.history.pushState({ set: collection.key }, '');
    const onPop = () => onClose();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [collection.key, onClose]);

  const close = () => window.history.back();

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label={collection.title}
        className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-3 border-b border-slate-100">
          <button onClick={close} aria-label="닫기" className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
          <p className="text-3xl">{collection.emoji}</p>
          <h2 className="text-lg font-black text-slate-900 mt-1">{collection.title}</h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">{collection.desc}</p>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{PARTNERS_NOTICE}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {collection.items.map(it => (
            <a
              key={it.q}
              href={coupangSearchUrl(it.q, 'set')}
              target="_blank"
              rel="noopener sponsored"
              className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-slate-100 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-slate-800 truncate">{it.q}</p>
                <p className="text-[10px] text-slate-400 font-bold truncate">{it.note}</p>
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-full bg-orange-500 text-white text-[11px] font-black">
                쿠팡에서 보기 <ExternalLink size={11} />
              </span>
            </a>
          ))}
          <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-2">
            가격·배송은 쿠팡에서 확인하세요. {PARTNERS_NOTICE}
          </p>
        </div>
      </div>
    </div>
  );
}
