import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.jsx'

// Vercel Web Analytics (방문·경로·유입). 대시보드에서 프로젝트 Analytics를 켜야 수집됨.
// ?ref=igbio 꼬리표를 utm_source로도 넘겨 Analytics 'UTM' 패널에서 유입별 방문 수가 보이게 함
inject({
  mode: import.meta.env.PROD ? 'production' : 'development',
  beforeSend(event) {
    try {
      const url = new URL(event.url);
      const ref = url.searchParams.get('ref');
      if (ref && !url.searchParams.get('utm_source')) {
        url.searchParams.set('utm_source', ref.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12));
        return { ...event, url: url.toString() };
      }
    } catch { /* 그대로 보냄 */ }
    return event;
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
