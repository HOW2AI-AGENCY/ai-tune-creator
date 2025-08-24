import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const { 
    isInTelegram, 
    isAuthenticating, 
    authError, 
    autoAuthDisabled, 
    authenticateWithTelegram, 
    resetAutoAuth, 
    clearError,
    authData
  } = useTelegramAuth();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleManualTelegramAuth = async () => {
    clearError();
    await authenticateWithTelegram();
  };

  const handleReset = () => {
    resetAutoAuth();
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Telegram Mini App Status */}
        {isInTelegram && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Telegram Mini App
              </h2>
              <p className="text-muted-foreground mb-4">
                Вход через Telegram
              </p>
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {authError}
                </AlertDescription>
              </Alert>
            )}

            {autoAuthDisabled && (
              <Alert>
                <AlertDescription>
                  Автоматический вход отключен. Используйте кнопку ниже для ручного входа.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleManualTelegramAuth}
                disabled={isAuthenticating}
                className="w-full"
                size="lg"
              >
                {isAuthenticating ? "Выполняется вход..." : "Войти через Telegram"}
              </Button>

              {autoAuthDisabled && (
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="w-full"
                >
                  Сбросить и попробовать снова
                </Button>
              )}

              <Button 
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                variant="ghost"
                size="sm"
                className="w-full text-xs"
              >
                {showDebugInfo ? "Скрыть" : "Показать"} отладочную информацию
              </Button>
            </div>

            {showDebugInfo && authData && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1">
                <div><strong>Telegram ID:</strong> {authData.telegramId}</div>
                <div><strong>Имя:</strong> {authData.firstName}</div>
                <div><strong>Данные:</strong> {authData.initData.length} символов</div>
                <div><strong>Авто-аутентификация:</strong> {autoAuthDisabled ? "Отключена" : "Включена"}</div>
              </div>
            )}
          </div>
        )}

        {/* Regular Auth Form - always shown, with Telegram integration if available */}
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;