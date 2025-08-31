/**
 * Service Worker Update Notification
 * Shows notifications for service worker events (install, update, etc.)
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Download, RefreshCw, Wifi, WifiOff, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { serviceWorkerManager } from '@/lib/service-worker/sw-manager';
import { cn } from '@/lib/utils';

type NotificationType = 'installed' | 'updated' | 'update-available' | 'offline' | 'online';

interface Notification {
  type: NotificationType;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export const UpdateNotification: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStatus, setCacheStatus] = useState<{ totalSize: number; caches: any[] }>({
    totalSize: 0,
    caches: []
  });
  const { toast } = useToast();

  // Handle service worker events
  useEffect(() => {
    const handleInstalled = () => {
      const notification: Notification = {
        type: 'installed',
        message: 'App is ready for offline use!',
      };
      setNotifications(prev => [...prev, notification]);
      
      toast({
        title: 'App Installed',
        description: 'You can now use the app offline',
      });
    };

    const handleUpdated = () => {
      const notification: Notification = {
        type: 'updated',
        message: 'App has been updated!',
      };
      setNotifications(prev => [...prev, notification]);
      
      toast({
        title: 'App Updated',
        description: 'Latest version is now active',
      });
    };

    const handleUpdateAvailable = () => {
      const notification: Notification = {
        type: 'update-available',
        message: 'A new version is available!',
        action: async () => {
          await serviceWorkerManager.skipWaiting();
          removeNotification('update-available');
        },
        actionLabel: 'Update Now',
      };
      setNotifications(prev => [...prev, notification]);
      
      toast({
        title: 'Update Available',
        description: 'Click to update to the latest version',
        action: (
          <Button 
            size="sm" 
            onClick={() => serviceWorkerManager.skipWaiting()}
          >
            Update
          </Button>
        ),
      });
    };

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      const notification: Notification = {
        type: 'online',
        message: 'Back online! Syncing data...',
      };
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after 3 seconds
      setTimeout(() => removeNotification('online'), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      const notification: Notification = {
        type: 'offline',
        message: 'You\'re offline. Using cached content.',
      };
      setNotifications(prev => [...prev, notification]);
    };

    // Add event listeners
    window.addEventListener('sw-installed', handleInstalled);
    window.addEventListener('sw-updated', handleUpdated);
    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('sw-installed', handleInstalled);
      window.removeEventListener('sw-updated', handleUpdated);
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Update cache status periodically
  useEffect(() => {
    const updateCacheStatus = async () => {
      const status = await serviceWorkerManager.getCacheStatus();
      setCacheStatus(status);
    };

    updateCacheStatus();
    const interval = setInterval(updateCacheStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const removeNotification = (type: NotificationType) => {
    setNotifications(prev => prev.filter(n => n.type !== type));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'installed':
        return <Download className="h-4 w-4" />;
      case 'updated':
        return <RefreshCw className="h-4 w-4" />;
      case 'update-available':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      case 'online':
        return <Wifi className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getVariant = (type: NotificationType) => {
    switch (type) {
      case 'installed':
      case 'updated':
      case 'online':
        return 'default';
      case 'update-available':
        return 'secondary';
      case 'offline':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (notifications.length === 0 && process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      {/* Connection Status Indicator */}
      <div className="fixed top-4 left-4 z-50">
        <Badge 
          variant={isOnline ? 'default' : 'destructive'}
          className={cn(
            'flex items-center gap-1 transition-all',
            !isOnline && 'animate-pulse'
          )}
        >
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Cache Status (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-20 z-50">
          <Badge variant="secondary" className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            Cache: {cacheStatus.totalSize} items
          </Badge>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification, index) => (
          <Card
            key={`${notification.type}-${index}`}
            className={cn(
              'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg',
              'animate-slide-in-left'
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(notification.type)}
                  <CardTitle className="text-sm">Service Worker</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeNotification(notification.type)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-2">
                {notification.message}
              </CardDescription>
              
              {notification.action && notification.actionLabel && (
                <Button
                  size="sm"
                  variant={getVariant(notification.type)}
                  onClick={notification.action}
                  className="w-full h-6 text-xs"
                >
                  {notification.actionLabel}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};