import React, { useState, useMemo } from 'react';
import { Search, Zap, ArrowUpRight, CreditCard, Info, Tag, X, ArrowDownAZ, ArrowDownUp, Flame, Star, MapPin, Phone, Clock, ShoppingCart, Truck } from 'lucide-react';
import { RAW_DATA } from './data.js';
import { PX_STORES } from './stores.js';

const PARTNERS_ID = "cmyTxY";

const CAT_EMOJI = {
  '전체': '🛒',
  '주류': '🍷',
  '유제품·음료': '🥛',
  '스킨케어': '✨',
  '선케어': '☀️',
  '메이크업': '💄',
  '헤어케어': '💇',
  '향수·바디': '🌸',
  '위생·생활용품': '🧴',
  '아이스크림': '🍦',
  '과자·간식': '🍪',
  '식품·건강기능식품': '🍱',
  '군장·피복': '🎖️',
};

export default function App() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('전체');
  const [showInfo, setShowInfo] = useState(false);
  const [showStores, setShowStores] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [tab, setTab] = useState('all');

  // 추천상품: 카테고리별 최고가 + 최저가
  const RECOMMENDED_IDS = useMemo(() => {
    const ids = [];
    const catGroups = {};
    RAW_DATA.forEach(item => {
      if (!catGroups[item.cat]) catGroups[item.cat] = [];
      catGroups[item.cat].push(item);
    });
    Object.values(catGroups).forEach(items => {
      const sorted = [...items].sort((a, b) => b.px - a.px);
      ids.push(sorted[0].id);
      ids.push(sorted[sorted.length - 1].id);
    });
    return new Set(ids);
  }, []);

  const categories = useMemo(() => {
    return ['전체', ...new Set(RAW_DATA.map(item => item.cat))];
  }, []);

  const filteredItems = useMemo(() => {
    let items = RAW_DATA.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.company.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCat === '전체' || item.cat === selectedCat;
      return matchesSearch && matchesCat;
    });

    if (tab === 'hot') items = items.filter(i => i.hot);
    if (tab === 'pick') items = items.filter(i => RECOMMENDED_IDS.has(i.id));

    if (sortBy === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    else if (sortBy === 'price-asc') items = [...items].sort((a, b) => a.px - b.px);
    else if (sortBy === 'price-desc') items = [...items].sort((a, b) => b.px - a.px);

    return items;
  }, [search, selectedCat, sortBy, tab, RECOMMENDED_IDS]);

  const filteredStores = useMemo(() => {
    if (!storeSearch) return PX_STORES;
    const q = storeSearch.toLowerCase();
    return PX_STORES.filter(s =>
      s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q)
    );
  }, [storeSearch]);

  const handleItemClick = (item) => {
    const targetUrl = item.link && item.link.trim() !== ''
      ? item.link
      : `https://link.coupang.com/a/${PARTNERS_ID}?q=${encodeURIComponent(item.name)}`;
    window.open(targetUrl, '_blank');
  };

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
              PX 신규상품 {RAW_DATA.length}개 · 품절 시 <span className="text-orange-500 font-black">쿠팡 바로 구매</span> 🚀
            </p>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="상품명 또는 업체명으로 검색"
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
                {[
                  { key: 'all', label: '전체', icon: <Tag size={11} /> },
                  { key: 'hot', label: '인기', icon: <Flame size={11} /> },
                  { key: 'pick', label: '추천', icon: <Star size={11} /> },
                ].map(t => (
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
              <div className="flex flex-row flex-shrink-0 gap-0.5">
                {[
                  { key: 'default', label: '기본' },
                  { key: 'name', label: '이름' },
                  { key: 'price-asc', label: '저가' },
                  { key: 'price-desc', label: '고가' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortBy(s.key)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                      sortBy === s.key
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
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
              {tab === 'hot' ? <><Flame size={12} /> 인기상품</> : tab === 'pick' ? <><Star size={12} /> 추천상품</> : <><Tag size={12} /> 전체상품</>}
            </h2>
            <span className="text-[10px] font-bold text-slate-300">{filteredItems.length}개</span>
          </div>

          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer active:scale-[0.97]"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-50 relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
                  <span className="text-3xl">{CAT_EMOJI[item.cat] || '📦'}</span>
                  {item.hot && (
                    <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-br-lg">🔥</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">{item.cat}</span>
                    {item.hot && <span className="text-[9px] font-black text-red-400 bg-red-50 px-2 py-0.5 rounded-full">인기</span>}
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mb-0.5 tracking-tight">{item.spec} · {item.company}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-900">{item.px.toLocaleString()}원</span>
                    <span className="text-[9px] font-bold text-slate-300">PX가</span>
                  </div>
                  <p className="text-[9px] text-orange-400 font-bold mt-0.5">품절 시 쿠팡에서 바로 구매 →</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm border border-orange-100 group-hover:border-orange-500 group-hover:shadow-orange-200 group-hover:shadow-md">
                    <ShoppingCart size={16} />
                  </div>
                  <span className="text-[8px] font-black text-orange-300 group-hover:text-orange-500 tracking-tighter">쿠팡</span>
                </div>
              </div>
            ))
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
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-3 rounded-2xl mb-3 border border-orange-100/50 flex items-center justify-center gap-2">
            <Truck size={14} className="text-orange-500 flex-shrink-0" />
            <span className="text-[11px] font-black text-orange-600 whitespace-nowrap">품절?</span>
            <span className="text-[10px] text-orange-500/80 font-bold whitespace-nowrap">터치하면 쿠팡 로켓배송 구매!</span>
          </div>
          <p className="text-[8px] text-slate-300 font-medium text-center leading-relaxed mb-2">
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
                2026년 PX 신규상품을 한눈에 검색하고 최저가로 구매할 수 있는 스마트 카탈로그입니다.
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛒</span>
                  <span className="text-xs font-bold text-slate-700">총 {RAW_DATA.length}개 상품 · {new Set(RAW_DATA.map(i => i.cat)).size}개 카테고리</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-xs font-bold text-slate-700">역대 PX 인기상품 데이터 기반 인기 태그</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">🔗</span>
                  <span className="text-xs font-bold text-slate-700">PX 품절 시 상품 터치 → 쿠팡 로켓배송 구매</span>
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
