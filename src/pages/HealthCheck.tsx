/**
 * Health Check - минимальная диагностическая страница
 */

import { bootLogger } from '@/components/debug/BootLogger';

const HealthCheck = () => {
  const bootLogs = bootLogger.getLogsFromStorage();
  const memoryInfo = (performance as any).memory;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">🩺 Health Check</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-3">📊 System Status</h2>
            <div className="space-y-2 text-sm">
              <div>React: ✅ Running</div>
              <div>Router: ✅ Working</div>
              <div>Theme: {document.documentElement.classList.contains('dark') ? '🌙 Dark' : '☀️ Light'}</div>
              <div>Timestamp: {new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border">
            <h2 className="text-lg font-semibold mb-3">💾 Memory Info</h2>
            <div className="space-y-2 text-sm">
              {memoryInfo ? (
                <>
                  <div>Used: {Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB</div>
                  <div>Total: {Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024)}MB</div>
                  <div>Limit: {Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)}MB</div>
                </>
              ) : (
                <div>Memory info not available</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🚀 Boot Logs</h2>
          <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded max-h-64 overflow-auto">
            {bootLogs.length > 0 ? (
              bootLogs.map((log: any, index: number) => (
                <div key={index} className="flex gap-2">
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{log.step}</span>
                  {log.data && <span className="text-blue-400">{JSON.stringify(log.data)}</span>}
                </div>
              ))
            ) : (
              <div>No boot logs available</div>
            )}
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-3">🛠 Actions</h2>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => {
                localStorage.setItem('debug', '1');
                window.location.reload();
              }}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/80"
            >
              Enable Debug Mode
            </button>
            <button 
              onClick={() => {
                bootLogger.clear();
                localStorage.removeItem('debug-errors');
                window.location.reload();
              }}
              className="bg-secondary text-secondary-foreground px-3 py-1 rounded text-sm hover:bg-secondary/80"
            >
              Clear Logs & Reload
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-accent text-accent-foreground px-3 py-1 rounded text-sm hover:bg-accent/80"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck;