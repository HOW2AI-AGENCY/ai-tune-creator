import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { quotaManager } from '@/lib/storage/quotaManager'
import { bootLogger } from '@/components/debug/BootLogger'

bootLogger.log('1. Starting application bootstrap');

// Initialize quota manager for localStorage management (only once)
try {
  bootLogger.log('2. Initializing quota manager');
  // Remove duplicate call - already handled in App.tsx
  
  // Monitor storage usage and preemptively clear if near quota
  if (quotaManager.isNearQuota(0.8)) {
    bootLogger.log('3. Storage near quota, clearing cache');
    console.warn('[QuotaManager] Storage near quota, clearing cache...');
    quotaManager.clearStorage(['auth', 'user', 'supabase']);
  } else {
    bootLogger.log('3. Storage quota OK');
  }
} catch (error) {
  bootLogger.log('3. ERROR in quota manager', error);
}

bootLogger.log('4. Looking for root element');
const rootElement = document.getElementById('root');
if (!rootElement) {
  bootLogger.log('4. ERROR: Root element not found');
  throw new Error('Root element not found. Make sure you have a <div id="root"></div> in your HTML.');
}

bootLogger.log('5. Root element found, creating React root');
try {
  const root = createRoot(rootElement);
  bootLogger.log('6. React root created, rendering App');
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  
  bootLogger.log('7. App rendered successfully');
} catch (error) {
  bootLogger.log('6-7. ERROR during React root creation/render', error);
  throw error;
}
