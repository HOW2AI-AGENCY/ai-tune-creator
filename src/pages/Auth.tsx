import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { TelegramAutoAuth } from "@/components/auth/TelegramAutoAuth";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";

const Auth = () => {
  const navigate = useNavigate();
  const { isAvailable } = useTelegramWebApp();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [telegramAuthFailed, setTelegramAuthFailed] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('User already authenticated, redirecting to dashboard');
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };
    checkUser();
  }, [navigate]);

  // Show auth form immediately if not in Telegram
  useEffect(() => {
    if (!isAvailable) {
      setShowAuthForm(true);
    }
  }, [isAvailable]);

  const handleTelegramAuthFailed = (error: string) => {
    console.log('🔐 Auth page: Telegram auth failed', error);
    setTelegramAuthFailed(true);
    setShowAuthForm(true);
  };

  const handleTelegramAuthComplete = () => {
    console.log('🔐 Auth page: Telegram auth completed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Try Telegram auto-auth first if in Telegram Mini App */}
        {isAvailable && !showAuthForm && (
          <TelegramAutoAuth 
            onAuthComplete={handleTelegramAuthComplete}
            onAuthFailed={handleTelegramAuthFailed}
          />
        )}
        
        {/* Show auth form if not in Telegram or Telegram auth failed */}
        {showAuthForm && (
          <>
            {telegramAuthFailed && (
              <div className="text-center mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Автоматический вход через Telegram не удался. Используйте форму ниже.
                </p>
              </div>
            )}
            <AuthForm />
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;