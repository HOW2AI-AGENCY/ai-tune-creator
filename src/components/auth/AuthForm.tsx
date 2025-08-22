import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConnectionDiagnostics } from "./ConnectionDiagnostics";
import { useTelegramAuth } from "@/hooks/useTelegramWebApp";
import { Music, Apple, Play } from "lucide-react";

export const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { authData, isInTelegram, isAuthenticated } = useTelegramAuth();

  // Автоматическая авторизация через Telegram
  useEffect(() => {
    if (isAuthenticated && authData && isInTelegram) {
      handleTelegramAuth();
    }
  }, [isAuthenticated, authData, isInTelegram]);

  const handleTelegramAuth = async () => {
    if (!authData) return;
    
    setIsLoading(true);
    try {
      // Вызываем нашу Edge Function для Telegram авторизации
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { authData }
      });

      if (error) {
        setError(`Telegram auth error: ${error.message}`);
      } else if (data?.session) {
        // Устанавливаем сессию в Supabase
        await supabase.auth.setSession(data.session);
        toast({
          title: "Welcome from Telegram!",
          description: "You have been successfully authenticated.",
        });
      }
    } catch (err) {
      setError("Telegram authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'spotify' | 'google' | 'apple') => {
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        setError(`${provider} authentication failed: ${error.message}`);
      }
    } catch (err) {
      setError(`An error occurred during ${provider} authentication.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("This email is already registered. Please try signing in instead.");
        } else {
          setError(error.message);
        }
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      console.log('Attempting sign in for:', email);
      
      // Clear any existing invalid tokens before signing in
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (error.message.includes("Failed to fetch")) {
          setError("Connection error. Please check your internet connection and try again.");
        } else {
          setError(error.message);
        }
      } else {
        console.log('Sign in successful');
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      if (err instanceof Error && err.message.includes("Failed to fetch")) {
        setError("Unable to connect to the server. Please check your internet connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Enter your password"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Create a password"
                    minLength={6}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Разделитель */}
          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-2 text-muted-foreground text-sm">или продолжить с</span>
            </div>
          </div>

          {/* Социальные провайдеры */}
          <div className="space-y-3">
            {/* Spotify */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              onClick={() => handleSocialAuth('spotify')}
              disabled={isLoading}
            >
              <Music className="h-5 w-5 text-green-500" />
              <span>Spotify</span>
            </Button>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
            >
              <div className="h-5 w-5 bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">G</span>
              </div>
              <span>Google</span>
            </Button>

            {/* Apple */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11"
              onClick={() => handleSocialAuth('apple')}
              disabled={isLoading}
            >
              <Apple className="h-5 w-5" />
              <span>Apple</span>
            </Button>

            {/* Telegram (если в Telegram) */}
            {isInTelegram && (
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-3 h-11 bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                onClick={handleTelegramAuth}
                disabled={isLoading || isAuthenticated}
              >
                <Play className="h-5 w-5" />
                <span>{isAuthenticated ? 'Автоматический вход' : 'Telegram'}</span>
              </Button>
            )}
          </div>
          
          <div className="mt-6">
            <ConnectionDiagnostics />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};