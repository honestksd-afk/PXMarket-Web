import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'px-install-dismissed';

function detect() {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return {
    standalone,
    inApp: /Instagram|FBAN|FBAV|KAKAOTALK|NAVER\(|Line\//i.test(ua), // SNS 앱 안의 브라우저
    ios: /iPhone|iPad|iPod/i.test(ua),
    mobile: /Android|iPhone|iPad|iPod/i.test(ua),
  };
}

/** "어플 주세요" 요청에 맞춰, 홈 화면에 추가해 앱처럼 쓰는 방법 안내 */
export default function InstallBanner() {
  const [env] = useState(detect);
  const [prompt, setPrompt] = useState(null); // 안드로이드 크롬 설치 이벤트
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || env.standalone || !env.mobile) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* 저장 불가 환경 */ }
  };

  let body;
  if (env.inApp) {
    body = <>인스타·카톡 안에서 열렸어요. 오른쪽 위 <b>⋯</b> → <b>외부 브라우저로 열기</b> 후 홈 화면에 추가하면 앱처럼 쓸 수 있어요.</>;
  } else if (prompt) {
    body = <>홈 화면에 설치하면 앱처럼 바로 열 수 있어요.</>;
  } else if (env.ios) {
    body = <>Safari 아래 <b>공유 버튼</b> → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</>;
  } else {
    body = <>브라우저 메뉴 → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</>;
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
        <Smartphone size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black mb-0.5">PX MARKET 앱으로 쓰기</p>
        <p className="text-[11px] text-slate-300 leading-relaxed">{body}</p>
        {prompt && !env.inApp && (
          <button
            onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); dismiss(); }}
            className="mt-2 bg-white text-slate-900 text-xs font-black rounded-lg px-3 py-1.5"
          >
            홈 화면에 설치
          </button>
        )}
      </div>
      <button onClick={dismiss} aria-label="안내 닫기" className="p-1 text-slate-400 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
