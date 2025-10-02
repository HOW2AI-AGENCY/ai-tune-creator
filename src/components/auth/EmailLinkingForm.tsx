import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Validation schema with security best practices
const emailLinkingSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Введите корректный email адрес" })
    .max(255, { message: "Email слишком длинный" })
    .toLowerCase(),
  password: z
    .string()
    .min(8, { message: "Пароль должен содержать минимум 8 символов" })
    .max(72, { message: "Пароль слишком длинный" })
    .regex(/[A-Z]/, { message: "Пароль должен содержать хотя бы одну заглавную букву" })
    .regex(/[a-z]/, { message: "Пароль должен содержать хотя бы одну строчную букву" })
    .regex(/[0-9]/, { message: "Пароль должен содержать хотя бы одну цифру" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"]
});

type EmailLinkingFormData = z.infer<typeof emailLinkingSchema>;

interface EmailLinkingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EmailLinkingForm = ({ onSuccess, onCancel }: EmailLinkingFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkingSuccess, setLinkingSuccess] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<EmailLinkingFormData>({
    resolver: zodResolver(emailLinkingSchema),
    mode: "onBlur"
  });

  const password = watch("password");
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { strength: 33, label: "Слабый", color: "bg-red-500" };
    if (strength <= 4) return { strength: 66, label: "Средний", color: "bg-yellow-500" };
    return { strength: 100, label: "Сильный", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: EmailLinkingFormData) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Пользователь не авторизован",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update user email in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        email: data.email,
        password: data.password
      });

      if (updateError) {
        if (updateError.message.includes("already registered")) {
          toast({
            title: "Email занят",
            description: "Этот email уже используется другим аккаунтом",
            variant: "destructive"
          });
        } else {
          throw updateError;
        }
        return;
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ 
          display_name: data.email.split('@')[0] // Use email prefix as display name if not set
        })
        .eq('user_id', user.id)
        .is('display_name', null);

      if (profileError) {
        console.error('Profile update warning:', profileError);
        // Don't fail on profile update error
      }

      setLinkingSuccess(true);
      
      toast({
        title: "✅ Email привязан успешно!",
        description: "Теперь вы можете входить используя email и пароль"
      });

      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error: any) {
      console.error('Email linking failed:', error);
      toast({
        title: "Ошибка привязки",
        description: error.message || "Не удалось привязать email. Попробуйте позже.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (linkingSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Email успешно привязан!</h3>
              <p className="text-muted-foreground">
                Теперь вы можете входить используя как Telegram, так и email с паролем
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Привязать Email
        </CardTitle>
        <CardDescription>
          Добавьте email и пароль для входа без Telegram
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              После привязки email вы сможете входить двумя способами: через Telegram или через email/пароль
            </AlertDescription>
          </Alert>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email адрес <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              autoComplete="email"
              {...register("email")}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Пароль <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Минимум 8 символов"
              autoComplete="new-password"
              {...register("password")}
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            
            {/* Password Strength Indicator */}
            {password && !errors.password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Надежность пароля:</span>
                  <span className={`font-medium ${
                    passwordStrength.strength === 100 ? 'text-green-600' :
                    passwordStrength.strength === 66 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Подтвердите пароль <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              <Lock className="mr-2 h-4 w-4" />
              {isSubmitting ? "Привязываем..." : "Привязать Email"}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
