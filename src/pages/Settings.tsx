import { useState } from "react";
import { User, Bell, Palette, Shield, Database, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Mock user settings - will be replaced with real data from Supabase
  const [settings, setSettings] = useState({
    profile: {
      displayName: user?.user_metadata?.display_name || "",
      bio: "",
      avatarUrl: user?.user_metadata?.avatar_url || ""
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      aiGenerationComplete: true,
      projectUpdates: true,
      weeklyDigest: false
    },
    preferences: {
      defaultAiService: "suno",
      autoSaveProjects: true,
      darkMode: false
    }
  });

  const handleSave = (section: string) => {
    // TODO: Implement save to Supabase
    toast({
      title: "Настройки сохранены",
      description: `Ваши настройки ${section} были обновлены.`,
    });
  };

  const updateSetting = (section: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("settingsTitle")}</h1>
        <p className="text-muted-foreground">Управляйте настройками вашего аккаунта и приложения</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Предпочтения
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Безопасность
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
                    value={settings.profile.displayName}
                    onChange={(e) => updateSetting('profile', 'displayName', e.target.value)}
                    placeholder="Ваше отображаемое имя"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Биография</Label>
                <Textarea
                  id="bio"
                  value={settings.profile.bio}
                  onChange={(e) => updateSetting('profile', 'bio', e.target.value)}
                  placeholder="Расскажите о себе и вашей музыке..."
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL аватара</Label>
                <Input
                  id="avatarUrl"
                  value={settings.profile.avatarUrl}
                  onChange={(e) => updateSetting('profile', 'avatarUrl', e.target.value)}
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
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
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
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'pushNotifications', checked)}
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
                    checked={settings.notifications.aiGenerationComplete}
                    onCheckedChange={(checked) => updateSetting('notifications', 'aiGenerationComplete', checked)}
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
                    checked={settings.notifications.projectUpdates}
                    onCheckedChange={(checked) => updateSetting('notifications', 'projectUpdates', checked)}
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
                    checked={settings.notifications.weeklyDigest}
                    onCheckedChange={(checked) => updateSetting('notifications', 'weeklyDigest', checked)}
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
                    checked={settings.preferences.autoSaveProjects}
                    onCheckedChange={(checked) => updateSetting('preferences', 'autoSaveProjects', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Темная тема</Label>
                    <p className="text-sm text-muted-foreground">
                      Использовать темную тему в приложении
                    </p>
                  </div>
                  <Switch
                    id="darkMode"
                    checked={settings.preferences.darkMode}
                    onCheckedChange={(checked) => updateSetting('preferences', 'darkMode', checked)}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave('предпочтений')}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить предпочтения
              </Button>
            </CardContent>
          </Card>
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