import { useState } from "react";
import { User, Bell, Palette, Shield, Database, Save, Bot, Sparkles, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserSettings } from "@/hooks/useUserSettings";
import { AIPromptSettings } from "@/features/ai-generation/components/AIPromptSettings";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { settings, isLoading, isSaving, updateSetting, saveSettings, linkAccount, isConnectedViaTelegram } = useUserSettings();
  
  const [newEmail, setNewEmail] = useState("");

  const handleSave = async (section: string) => {
    const sectionKey = section.toLowerCase() as keyof typeof settings;
    await saveSettings(sectionKey);
  };

  const handleLinkEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите email адрес",
        variant: "destructive"
      });
      return;
    }

    const success = await linkAccount('email', { email: newEmail.trim() });
    if (success) {
      setNewEmail("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("settingsTitle")}</h1>
        <p className="text-muted-foreground">Управляйте настройками вашего аккаунта и приложения</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="p-2 md:p-3" title="Профиль">
            <User className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Профиль</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="p-2 md:p-3" title="Уведомления">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="p-2 md:p-3" title="Предпочтения">
            <Palette className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Предпочтения</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="p-2 md:p-3" title="Настройки ИИ">
            <Bot className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Настройки ИИ</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="p-2 md:p-3" title="Безопасность">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Безопасность</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Привязка аккаунтов</CardTitle>
                <CardDescription>
                  Управляйте связанными аккаунтами
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                Привязан
              </span>
            </div>

            {isConnectedViaTelegram ? (
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm">T</span>
                  </div>
                  <div>
                    <p className="font-medium">Telegram</p>
                    <p className="text-sm text-muted-foreground">Аккаунт привязан</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  Привязан
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border border-dashed border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">T</span>
                  </div>
                  <div>
                    <p className="font-medium">Telegram</p>
                    <p className="text-sm text-muted-foreground">Доступно только в Telegram</p>
                  </div>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  Не доступно
                </span>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Привязать дополнительный email</Label>
                <div className="flex gap-2">
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder="email@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button 
                    onClick={handleLinkEmail} 
                    disabled={!newEmail.trim() || isSaving}
                  >
                    Привязать
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация профиля</CardTitle>
              <CardDescription>
                Обновите информацию профиля и то, как другие видят вас на платформе
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email нельзя изменить здесь. Обратитесь в поддержку при необходимости.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Отображаемое имя</Label>
                  <Input
                    id="displayName"
                    value={settings.profile.display_name || ""}
                    onChange={(e) => updateSetting('profile', 'display_name', e.target.value)}
                    placeholder="Ваше отображаемое имя"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Биография</Label>
                <Textarea
                  id="bio"
                  value={settings.profile.bio || ""}
                  onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                  placeholder="Расскажите о себе и вашей музыке..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL аватара</Label>
                <Input
                  id="avatarUrl"
                  value={settings.profile.avatar_url || ""}
                  onChange={(e) => updateSetting('profile', 'avatar_url', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <Button onClick={() => handleSave('профиля')}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить профиль
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки уведомлений</CardTitle>
              <CardDescription>
                Выберите, какие уведомления вы хотите получать
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email уведомления</Label>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления по электронной почте
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.notifications.email_notifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'email_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotifications">Push уведомления</Label>
                    <p className="text-sm text-muted-foreground">
                      Получать push-уведомления в браузере
                    </p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={settings.notifications.push_notifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'push_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="aiGenerationComplete">ИИ генерация завершена</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомлять когда генерация музыки ИИ завершена
                    </p>
                  </div>
                  <Switch
                    id="aiGenerationComplete"
                    checked={settings.notifications.ai_generation_complete}
                    onCheckedChange={(checked) => updateSetting('notifications', 'ai_generation_complete', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="projectUpdates">Обновления проектов</Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомлять об изменениях проектов и коллаборациях
                    </p>
                  </div>
                  <Switch
                    id="projectUpdates"
                    checked={settings.notifications.project_updates}
                    onCheckedChange={(checked) => updateSetting('notifications', 'project_updates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyDigest">Еженедельная сводка</Label>
                    <p className="text-sm text-muted-foreground">
                      Получать еженедельную сводку вашей активности
                    </p>
                  </div>
                  <Switch
                    id="weeklyDigest"
                    checked={settings.notifications.weekly_digest}
                    onCheckedChange={(checked) => updateSetting('notifications', 'weekly_digest', checked)}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('уведомлений')}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить уведомления
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Предпочтения приложения</CardTitle>
              <CardDescription>
                Настройте, как приложение работает для вас
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoSaveProjects">Автосохранение проектов</Label>
                    <p className="text-sm text-muted-foreground">
                      Автоматически сохранять изменения в проектах
                    </p>
                  </div>
                  <Switch
                    id="autoSaveProjects"
                    checked={settings.preferences.auto_save_projects}
                    onCheckedChange={(checked) => updateSetting('preferences', 'auto_save_projects', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Тема</Label>
                    <p className="text-sm text-muted-foreground">
                      Выберите тему приложения
                    </p>
                  </div>
                  <Select 
                    value={settings.preferences.theme} 
                    onValueChange={(value) => updateSetting('preferences', 'theme', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Светлая</SelectItem>
                      <SelectItem value="dark">Темная</SelectItem>
                      <SelectItem value="system">Системная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => handleSave('предпочтений')}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить предпочтения
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <AIPromptSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки безопасности</CardTitle>
              <CardDescription>
                Управляйте безопасностью вашего аккаунта и данными
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Безопасность аккаунта</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ваш аккаунт защищен email-аутентификацией через Supabase Auth.
                  </p>
                  <Button variant="outline" size="sm">
                    Изменить пароль
                  </Button>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Экспорт данных</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Скачать копию ваших данных, включая проекты, треки и ИИ генерации.
                  </p>
                  <Button variant="outline" size="sm">
                    <Database className="mr-2 h-4 w-4" />
                    Экспортировать данные
                  </Button>
                </div>

                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                  <h4 className="font-medium mb-2 text-destructive">Опасная зона</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Навсегда удалить ваш аккаунт и все связанные данные.
                  </p>
                  <Button variant="destructive" size="sm">
                    Удалить аккаунт
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}