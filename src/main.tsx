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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
