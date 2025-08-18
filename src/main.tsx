import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { quotaManager } from '@/lib/storage/quotaManager'

// Initialize quota manager for localStorage management
quotaManager.initGlobalErrorHandler();

// Monitor storage usage and preemptively clear if near quota
if (quotaManager.isNearQuota(0.8)) {
  console.warn('[QuotaManager] Storage near quota, clearing cache...');
  quotaManager.clearStorage(['auth', 'user', 'supabase']);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found. Make sure you have a <div id="root"></div> in your HTML.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
