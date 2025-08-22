import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, session, loading } = useAuth();
  const { isInTelegram, isAuthenticating } = useTelegramAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If we don't require auth, render children regardless
    if (!requireAuth) return;

    // Don't redirect if we're in Telegram and still trying to authenticate
    if (isInTelegram && isAuthenticating) {
      console.log('ProtectedRoute: Telegram auth in progress, waiting...');
      return;
    }

    // If not loading and no authenticated user, redirect to auth
    if (!loading && !user && !session && !isAuthenticating) {
      console.log('ProtectedRoute: No authenticated user, redirecting to /auth');
      navigate('/auth', { replace: true });
    }
  }, [loading, user, session, requireAuth, navigate, isInTelegram, isAuthenticating]);

  // Show loading state while checking authentication or during Telegram auth
  if (loading || (isInTelegram && isAuthenticating)) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[250px]" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-[100px] mb-2" />
                  <Skeleton className="h-8 w-[60px]" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If auth is not required, always render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is authenticated, render children
  if (user && session) {
    return <>{children}</>;
  }

  // If we reach here, user is not authenticated
  // This shouldn't happen due to the useEffect redirect, but just in case
  return null;
};