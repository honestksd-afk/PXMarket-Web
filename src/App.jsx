import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Zap, ArrowUpRight, CreditCard, Info, Tag, X, Flame, MapPin, Phone, Clock, ShoppingCart, ClipboardList, Heart, Trash2, Minus, Plus, Sparkles, TrendingDown } from 'lucide-react';
import { PX_STORES } from './stores.js';
import { CAT_EMOJI, CATEGORY_ORDER, loadCatalog, migrateLegacyCart, matches, coupangUrl } from './catalog.js';

const PAGE_SIZE = 40;

// 상품 사진 (없거나 못 불러오면 카테고리 이모지)
function ProductThumb({ item, className, emojiClass }) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) return <span className={emojiClass}>{CAT_EMOJI[item.category] || '📦'}</span>;
  return (
    <img
      src={`/images/p/${item.id}.webp`}
      alt={item.name}
      loading="lazy"
      decoding="async"
      width={64}
      height={64}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loadError, setLoadError] = useState(false);
  // 몇 개까지 그렸는지. 필터 조합(key)이 바뀌면 처음 PAGE_SIZE개부터 다시 그림
  const [visible, setVisible] = useState({ key: '', count: PAGE_SIZE });
  const sentinelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('전체');
  const [showInfo, setShowInfo] = useState(false);
  const [showStores, setShowStores] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [tab, setTab] = useState('all');
  const [showCart, setShowCart] = useState(false);

  // 장바구니: { id: 수량 }
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('px-cart') || '{}');
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem('px-cart', JSON.stringify(cart)); } catch { /* 저장 불가 환경 */ }
  }, [cart]);

  useEffect(() => {
    loadCatalog()
      .then(({ products, meta }) => { setProducts(products); setMeta(meta); })
      .catch(() => setLoadError(true));
    // 구버전 쇼핑 리스트(숫자 id) → p_code
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('px-cart') || '{}'); } catch { /* 무시 */ }
    migrateLegacyCart(saved).then(next => { if (next !== saved) setCart(next); });
  }, []);

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const toggleCart = useCallback((e, id) => {
    e.stopPropagation();
    setCart(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => {
      const next = { ...prev };
      const qty = (next[id] || 1) + delta;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const cartItems = useMemo(() => {
    return Object.keys(cart).map(id => productById.get(id)).filter(Boolean);
  }, [cart, productById]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * (cart[item.id] || 1), 0);
  }, [cartItems, cart]);

  // 리스트에 담았지만 이번 데이터에서 내려간(단종) 상품은 개수에서 제외
  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (cart[item.id] || 0), 0);
  }, [cartItems, cart]);

  const categories = useMemo(() => {
    const present = new Set(products.map(p => p.category));
    return ['전체', ...CATEGORY_ORDER.filter(c => present.has(c)), ...[...present].filter(c => !CATEGORY_ORDER.includes(c))];
  }, [products]);

  const priceDropCount = useMemo(() => products.filter(p => p.prevPrice > p.price).length, [products]);

  const tabs = useMemo(() => [
    { key: 'all', label: '전체', icon: <Tag size={11} /> },
    { key: 'new', label: '신규', icon: <Sparkles size={11} /> },
    { key: 'hot', label: '인기', icon: <Flame size={11} /> },
    ...(priceDropCount > 0 ? [{ key: 'drop', label: '가격↓', icon: <TrendingDown size={11} /> }] : []),
  ], [priceDropCount]);

  const filteredItems = useMemo(() => {
    let items = products.filter(item =>
      (selectedCat === '전체' || item.category === selectedCat) && matches(item, search)
    );

    if (tab === 'new') items = items.filter(i => i.isNew);
    if (tab === 'hot') items = items.filter(i => i.hot);
    if (tab === 'drop') items = items.filter(i => i.prevPrice > i.price);

    if (sortBy === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    else if (sortBy === 'price-asc') items = [...items].sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') items = [...items].sort((a, b) => b.price - a.price);

    return items;
  }, [products, search, selectedCat, sortBy, tab]);

  const filterKey = [search, selectedCat, sortBy, tab].join('|');
  const visibleCount = visible.key === filterKey ? visible.count : PAGE_SIZE;

  // 목록 끝에 닿으면 다음 묶음을 그림 (상품 2천여 개를 한 번에 그리지 않도록)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible({ key: filterKey, count: visibleCount + PAGE_SIZE });
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [filterKey, visibleCount]);

  const filteredStores = useMemo(() => {
    if (!storeSearch) return PX_STORES;
    const q = storeSearch.toLowerCase();
    return PX_STORES.filter(s =>
      s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
    );
  }, [storeSearch]);

  const handleItemClick = (item) => {
    const url = coupangUrl(item);
    if (url) window.open(url, '_blank', 'noopener');
  };

  const updatedLabel = meta ? `${Number(meta.updatedAt.slice(5, 7))}/${Number(meta.updatedAt.slice(8, 10))} 기준` : '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex justify-center font-sans text-slate-900">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col relative overflow-x-hidden border-x border-slate-100">

        {/* Sticky Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-50">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Zap size={22} fill="currentColor" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">PX MARKET</h1>
                  <span className="text-[10px] font-bold text-indigo-500 tracking-widest">PRO 2026</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCart(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative"
                >
                  <ClipboardList size={20} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{cartCount > 99 ? '99+' : cartCount}</span>
                  )}
                </button>
                <button
                  onClick={() => setShowStores(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <MapPin size={20} />
                </button>
                <button
                  onClick={() => setShowInfo(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Info size={20} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium mb-4 whitespace-nowrap overflow-hidden text-ellipsis">
              PX 전체상품 {products.length ? products.length.toLocaleString() : '…'}개 · {updatedLabel} · 품절 시 <span className="text-orange-500 font-black">쿠팡 바로 구매</span> 🚀
            </p>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="상품명·업체명 검색 (초성도 OK: ㅅㄹㅁ)"
                className="w-full bg-slate-100/50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    selectedCat === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {CAT_EMOJI[cat] || '📦'} {cat}
                </button>
              ))}
            </div>

            {/* Tab & Sort Row */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex flex-row flex-shrink-0 gap-1">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex flex-row items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                      tab === t.key
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="정렬"
                className="flex-shrink-0 bg-indigo-50 text-indigo-600 text-[11px] font-bold rounded-lg px-2 py-1.5 outline-none"
              >
                <option value="default">기본순</option>
                <option value="name">이름순</option>
                <option value="price-asc">낮은 가격</option>
                <option value="price-desc">높은 가격</option>
              </select>
            </div>
          </div>
        </header>

        {/* Product List */}
        <main className="flex-1 px-6 py-4 space-y-4 pb-48">
          {/* Store Finder Banner */}
          <button
            onClick={() => setShowStores(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-black text-white">내 주변 PX 영외마트 찾기</p>
              <p className="text-[10px] text-indigo-200 font-bold">전국 {PX_STORES.length}개소 위치·운영시간·전화번호</p>
            </div>
            <ArrowUpRight size={18} className="text-white/60 flex-shrink-0" />
          </button>

          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-400 tracking-widest flex items-center gap-2">
              {tab === 'hot' ? <><Flame size={12} /> 인기상품</>
                : tab === 'new' ? <><Sparkles size={12} /> 2026 신규상품</>
                : tab === 'drop' ? <><TrendingDown size={12} /> 가격 인하</>
                : <><Tag size={12} /> 전체상품</>}
            </h2>
            <span className="text-[10px] font-bold text-slate-300">{filteredItems.length.toLocaleString()}개</span>
          </div>

          {!products.length && !loadError ? (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-[112px] rounded-[24px] bg-slate-50 animate-pulse" />
            ))
          ) : loadError ? (
            <div className="text-center py-24">
              <p className="text-slate-400 font-bold text-sm mb-3">상품 정보를 불러오지 못했습니다.</p>
              <button onClick={() => window.location.reload()} className="text-xs font-black text-indigo-600">다시 시도</button>
            </div>
          ) : filteredItems.length > 0 ? (
            <>
            {filteredItems.slice(0, visibleCount).map(item => {
              const canBuy = 'link' in item;
              const dropped = item.prevPrice > item.price;
              return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center gap-4 transition-all ${canBuy ? 'hover:shadow-xl hover:border-indigo-100 cursor-pointer active:scale-[0.97]' : ''}`}
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-100 relative overflow-hidden">
                  <ProductThumb item={item} className="w-full h-full object-contain" emojiClass="text-3xl" />
                  {item.hot && (
                    <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg">🔥</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">{item.category}</span>
                    {item.isNew && <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">신규</span>}
                    {item.hot && <span className="text-[9px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full">인기</span>}
                    {item.outsideOnly && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">영외전용</span>}
                    {item.dutyFree && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">면세</span>}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5 tracking-tight truncate">{item.spec} · {item.company}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-900">{item.price.toLocaleString()}원</span>
                    <span className="text-[9px] font-bold text-slate-300">PX가</span>
                    {item.prevPrice && (
                      <span className={`text-[10px] font-bold ${dropped ? 'text-blue-500' : 'text-slate-400'}`}>
                        <s className="text-slate-300 mr-1">{item.prevPrice.toLocaleString()}</s>{dropped ? '▼' : '▲'}{Math.abs(item.prevPrice - item.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {canBuy && <p className="text-[9px] text-orange-400 font-bold mt-0.5">품절 시 쿠팡에서 바로 구매 →</p>}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={(e) => toggleCart(e, item.id)}
                    aria-label={cart[item.id] ? '쇼핑 리스트에서 빼기' : '쇼핑 리스트에 담기'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      cart[item.id]
                      ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                      : 'bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-400'
                    }`}
                  >
                    <Heart size={14} fill={cart[item.id] ? 'currentColor' : 'none'} />
                  </button>
                  {canBuy && (
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                      <ShoppingCart size={14} />
                    </div>
                  )}
                </div>
              </div>
              );
            })}
            {visibleCount < filteredItems.length && <div ref={sentinelRef} className="h-10" />}
            </>
          ) : (
            <div className="text-center py-24">
              <div className="inline-flex w-16 h-16 bg-slate-50 rounded-full items-center justify-center text-slate-200 mb-4">
                <Search size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">검색 결과가 없습니다.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-slate-100 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-50">
          <p className="text-[10px] text-slate-500 font-bold text-center leading-relaxed mb-2">
            이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-300 font-black text-[9px] tracking-[0.2em] uppercase">
            <CreditCard size={12} /> Secure Payment Verification
          </div>
        </footer>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6" onClick={() => setShowInfo(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 p-1 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Zap size={24} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">PX MARKET</h2>
                <span className="text-[10px] font-bold text-indigo-500 tracking-widest">PRO 2026</span>
              </div>
            </div>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800">
                PX 판매상품 전체를 한눈에 검색하고, 품절 시 쿠팡으로 바로 구매할 수 있는 스마트 카탈로그입니다.
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛒</span>
                  <span className="text-xs font-bold text-slate-700">총 {products.length.toLocaleString()}개 상품 · {categories.length - 1}개 카테고리{meta ? ` · ${meta.updatedAt} 업데이트` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-xs font-bold text-slate-700">역대 PX 인기상품 데이터 기반 인기 태그</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔗</span>
                  <span className="text-xs font-bold text-slate-700">PX 품절 시 상품 터치 → 쿠팡 로켓배송 구매 (주류·담배 제외)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📍</span>
                  <span className="text-xs font-bold text-slate-700">전국 {PX_STORES.length}개 영외마트 위치·운영시간 제공</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📱</span>
                  <span className="text-xs font-bold text-slate-700">홈 화면에 추가하면 앱처럼 사용 가능</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                본 서비스는 국군복지단 공식 서비스가 아니며, 상품 정보는 실제와 다를 수 있습니다.
                가격 및 재고는 각 PX 매장에서 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardList size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">PX 쇼핑 리스트</h2>
                  {cartCount > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{cartCount}개</span>}
                </div>
                <div className="flex items-center gap-2">
                  {cartCount > 0 && (
                    <button onClick={clearCart} className="text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors">전체 삭제</button>
                  )}
                  <button onClick={() => setShowCart(false)} className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">PX 방문 전 살 물건을 미리 담아두세요</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length > 0 ? cartItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden bg-white border border-slate-100">
                    <ProductThumb item={item} className="w-full h-full object-contain" emojiClass="text-2xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-black text-slate-800 truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{item.price.toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                      {cart[item.id] <= 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span className="text-sm font-black text-slate-700 w-5 text-center">{cart[item.id]}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 hover:bg-indigo-200 transition-colors">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16">
                  <div className="inline-flex w-16 h-16 bg-slate-50 rounded-full items-center justify-center text-slate-200 mb-4">
                    <Heart size={32} />
                  </div>
                  <p className="text-slate-400 font-bold text-sm mb-1">리스트가 비었어요</p>
                  <p className="text-[11px] text-slate-300 font-medium">상품의 하트를 눌러 담아보세요</p>
                </div>
              )}
            </div>

            {cartCount > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-500">예상 합계</span>
                  <span className="text-xl font-black text-slate-900">{cartTotal.toLocaleString()}원</span>
                </div>
                <p className="text-[9px] text-slate-400 font-medium text-center">실제 가격은 PX 매장에서 확인하세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Finder Modal */}
      {showStores && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={() => setShowStores(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Store Header */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">영외마트 찾기</h2>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{PX_STORES.length}개소</span>
                </div>
                <button onClick={() => setShowStores(false)} className="p-1 text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="마트명 또는 주소로 검색"
                  className="w-full bg-slate-50 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all border border-slate-100"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Store List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredStores.length > 0 ? filteredStores.map(store => (
                <div key={store.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-black text-slate-800">{store.name}</h3>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">{store.size}평</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{store.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-400 flex-shrink-0" />
                      <p className="text-[11px] text-slate-500 font-medium">
                        평일 {store.hours}{store.hoursSat ? ` · 토 ${store.hoursSat}` : ''}
                      </p>
                    </div>
                    {store.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                        <a href={`tel:${store.phone}`} className="text-[11px] text-indigo-500 font-bold">{store.phone}</a>
                      </div>
                    )}
                    {store.note && (
                      <p className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-lg mt-1">📌 {store.note}</p>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-bold text-sm">검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
