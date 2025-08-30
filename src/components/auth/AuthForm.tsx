import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ConnectionDiagnostics } from "./ConnectionDiagnostics";
import { Music, Apple } from "lucide-react";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSocialAuth = async (provider: 'spotify' | 'google' | 'apple') => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast({ title: "Ошибка входа", description: `${provider} authentication failed: ${error.message}`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Ошибка", description: `An error occurred during ${provider} authentication.`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

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
        const description = error.message.includes("already registered")
          ? "Этот email уже зарегистрирован. Попробуйте войти в систему."
          : error.message;
        toast({ title: "Ошибка регистрации", description, variant: "destructive" });
      } else {
        toast({
          title: "Проверьте вашу почту",
          description: "Мы отправили вам ссылку для подтверждения регистрации.",
        });
      }
    } catch (err) {
      toast({ title: "Ошибка", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      localStorage.removeItem('supabase.auth.token');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let description = "";
        if (error.message.includes("Invalid login credentials")) {
          description = "Неверный email или пароль. Проверьте данные и попробуйте снова.";
        } else if (error.message.includes("Failed to fetch")) {
          description = "Ошибка подключения. Проверьте интернет-соединение и попробуйте снова.";
        } else {
          description = error.message;
        }
        toast({ title: "Ошибка входа", description, variant: "destructive" });
      } else {
        toast({
          title: "Добро пожаловать!",
          description: "Вы успешно вошли в систему.",
        });
        // Navigate immediately after successful sign in
        navigate('/', { replace: true });
      }
    } catch (err) {
      const description = (err instanceof Error && err.message.includes("Failed to fetch"))
        ? "Не удается подключиться к серверу. Проверьте интернет-соединение."
        : "Произошла неожиданная ошибка. Попробуйте снова.";
      toast({ title: "Ошибка", description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
          <Music className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Добро пожаловать</CardTitle>
        <CardDescription>Войдите в свой аккаунт или создайте новый</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Войти</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Электронная почта</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Введите ваш email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Введите ваш пароль"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? "Вход..." : "Войти"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Электронная почта</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Введите ваш email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    placeholder="Создайте пароль (минимум 6 символов)"
                    className="h-11"
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? "Создание аккаунта..." : "Создать аккаунт"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <>
            <div className="relative my-6">
              <Separator />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="bg-background px-2 text-muted-foreground text-sm">или продолжить с</span>
              </div>
            </div>
            <div className="space-y-3">
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
            </div>
          </>
          
          <div className="mt-6 space-y-4">
            <ConnectionDiagnostics />
          </div>
        </CardContent>
    </Card>
  );
};