import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { quotaManager } from '@/lib/storage/quotaManager'
import { bootLogger } from '@/components/debug/BootLogger'

bootLogger.log('1. Starting application bootstrap');

// Initialize quota manager and clear excessive storage
try {
  bootLogger.log('2. Checking storage quota');
  
  // Aggressive cleanup to prevent quota issues
  const storageInfo = quotaManager.getStorageInfo();
  const percentUsed = (storageInfo.used / storageInfo.total) * 100;
  
  console.log('[Storage] Current usage:', {
    used: `${(storageInfo.used / 1024).toFixed(2)} KB`,
    total: `${(storageInfo.total / 1024).toFixed(2)} KB`,
    percent: `${percentUsed.toFixed(1)}%`
  });
  
  // If storage is over 50%, clear everything except critical data
  if (percentUsed > 50) {
    bootLogger.log('3. Storage over 50%, performing aggressive cleanup');
    console.warn('[QuotaManager] Storage usage high, clearing non-essential data...');
    quotaManager.clearStorage(['auth', 'supabase', 'sb-']);
    bootLogger.log('3. Cleanup complete');
  } else {
    bootLogger.log('3. Storage quota OK');
  }
} catch (error) {
  bootLogger.log('3. ERROR in quota manager', error);
  // Try emergency cleanup
  try {
    console.error('[QuotaManager] Emergency cleanup triggered');
    const keysToPreserve: string[] = [];
    
    // Save auth keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('sb-'))) {
        keysToPreserve.push(key);
      }
    }
    
    const preserved: Record<string, string> = {};
    keysToPreserve.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) preserved[key] = value;
    });
    
    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => {
      try { localStorage.setItem(k, v); } catch {}
    });
  } catch (e) {
    console.error('[QuotaManager] Failed emergency cleanup', e);
  }
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
