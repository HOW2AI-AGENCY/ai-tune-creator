import { User, Bell, Palette, Shield, Database, Save, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotificationSettingRow } from "@/components/settings/NotificationSettingRow";
import { SettingsInput } from "@/components/settings/SettingsInput";
import { SettingsTextarea } from "@/components/settings/SettingsTextarea";
import { ThemeSelector } from "@/components/settings/ThemeSelector";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserSettings } from "@/hooks/useUserSettings";
import { AIPromptSettings } from "@/features/ai-generation/components/AIPromptSettings";

export default function Settings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { settings, isLoading, isSaving, updateSetting, saveSettings } = useUserSettings();

  const handleSave = async (section: string) => {
    const sectionKey = section.toLowerCase() as keyof typeof settings;
    await saveSettings(sectionKey);
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
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Информация профиля</CardTitle>
              <CardDescription>
                Обновите информацию профиля и то, как другие видят вас на платформе
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <SettingsInput
                  id="email"
                  label="Email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                  description="Email нельзя изменить здесь. Обратитесь в поддержку при необходимости."
                />
                <SettingsInput
                  id="displayName"
                  label="Отображаемое имя"
                  value={settings.profile?.display_name || ""}
                  onChange={(e) => updateSetting('profile', 'display_name', e.target.value)}
                  placeholder="Ваше отображаемое имя"
                />
              </div>

              <SettingsTextarea
                id="bio"
                label="Биография"
                value={settings.profile?.bio || ""}
                onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                placeholder="Расскажите о себе и вашей музыке..."
                className="min-h-[100px] resize-none"
              />

              <SettingsInput
                id="avatarUrl"
                label="URL аватара"
                value={settings.profile?.avatar_url || ""}
                onChange={(e) => updateSetting('profile', 'avatar_url', e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <Button onClick={() => handleSave('профиля')} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Сохранение..." : "Сохранить профиль"}
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
                <NotificationSettingRow
                  id="emailNotifications"
                  title="Email уведомления"
                  description="Получать уведомления по электронной почте"
                  checked={settings.notifications?.email_notifications || false}
                  onCheckedChange={(checked) => updateSetting('notifications', 'email_notifications', checked)}
                />
                <Separator />
                <NotificationSettingRow
                  id="pushNotifications"
                  title="Push уведомления"
                  description="Получать push-уведомления в браузере"
                  checked={settings.notifications?.push_notifications || false}
                  onCheckedChange={(checked) => updateSetting('notifications', 'push_notifications', checked)}
                />
                <Separator />
                <NotificationSettingRow
                  id="aiGenerationComplete"
                  title="ИИ генерация завершена"
                  description="Уведомлять когда генерация музыки ИИ завершена"
                  checked={settings.notifications?.ai_generation_complete || false}
                  onCheckedChange={(checked) => updateSetting('notifications', 'ai_generation_complete', checked)}
                />
                <NotificationSettingRow
                  id="projectUpdates"
                  title="Обновления проектов"
                  description="Уведомлять об изменениях проектов и коллаборациях"
                  checked={settings.notifications?.project_updates || false}
                  onCheckedChange={(checked) => updateSetting('notifications', 'project_updates', checked)}
                />
                <NotificationSettingRow
                  id="weeklyDigest"
                  title="Еженедельная сводка"
                  description="Получать еженедельную сводку вашей активности"
                  checked={settings.notifications?.weekly_digest || false}
                  onCheckedChange={(checked) => updateSetting('notifications', 'weekly_digest', checked)}
                />
              </div>

              <Button onClick={() => handleSave('уведомлений')} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Сохранение..." : "Сохранить уведомления"}
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
                <NotificationSettingRow
                  id="autoSaveProjects"
                  title="Автосохранение проектов"
                  description="Автоматически сохранять изменения в проектах"
                  checked={settings.preferences?.auto_save_projects || false}
                  onCheckedChange={(checked) => updateSetting('preferences', 'auto_save_projects', checked)}
                />
                <Separator />
                <ThemeSelector
                  theme={settings.preferences?.theme || 'system'}
                  onThemeChange={(value) => updateSetting('preferences', 'theme', value)}
                />
              </div>

              <Button onClick={() => handleSave('предпочтений')} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Сохранение..." : "Сохранить предпочтения"}
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