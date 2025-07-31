import { useState } from "react";
import { User, Bell, Palette, Shield, Database, Save, Bot, Sparkles } from "lucide-react";
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
    },
    ai: {
      provider: "openai",
      model: "gpt-4o-mini",
      customPrompt: "Ты опытный музыкальный продюсер и A&R. Помоги создать детальное описание артиста на основе его имени и контекста. Включи информацию о жанре, локации, предыстории, музыкальном стиле и влияниях.",
      maxTokens: 1000,
      temperature: 0.7
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
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Профиль</span>
            <span className="sm:hidden">Я</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs sm:text-sm">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Уведомления</span>
            <span className="sm:hidden">🔔</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1 text-xs sm:text-sm">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Предпочтения</span>
            <span className="sm:hidden">⚙️</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1 text-xs sm:text-sm">
            <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">ИИ</span>
            <span className="sm:hidden">🤖</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Безопасность</span>
            <span className="sm:hidden">🔒</span>
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

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Настройки ИИ генерации
              </CardTitle>
              <CardDescription>
                Настройте параметры ИИ для генерации информации об артистах, лирики и маркетинговых материалов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Провайдер ИИ</Label>
                    <Select
                      value={settings.ai.provider}
                      onValueChange={(value) => updateSetting('ai', 'provider', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                        <SelectItem value="google">Google (Gemini)</SelectItem>
                        <SelectItem value="cohere">Cohere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Модель</Label>
                    <Select
                      value={settings.ai.model}
                      onValueChange={(value) => updateSetting('ai', 'model', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.ai.provider === 'openai' && (
                          <>
                            <SelectItem value="gpt-4o">GPT-4O</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                          </>
                        )}
                        {settings.ai.provider === 'anthropic' && (
                          <>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                            <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                          </>
                        )}
                        {settings.ai.provider === 'google' && (
                          <>
                            <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                            <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                          </>
                        )}
                        {settings.ai.provider === 'cohere' && (
                          <>
                            <SelectItem value="command">Command</SelectItem>
                            <SelectItem value="command-light">Command Light</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperature">Креативность (Temperature)</Label>
                    <div className="space-y-2">
                      <Input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.ai.temperature}
                        onChange={(e) => updateSetting('ai', 'temperature', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Консервативно (0.0)</span>
                        <span className="font-medium">{settings.ai.temperature}</span>
                        <span>Креативно (1.0)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Максимум токенов</Label>
                    <Input
                      type="number"
                      min="100"
                      max="4000"
                      value={settings.ai.maxTokens}
                      onChange={(e) => updateSetting('ai', 'maxTokens', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customPrompt">Системный промпт</Label>
                    <Textarea
                      id="customPrompt"
                      value={settings.ai.customPrompt}
                      onChange={(e) => updateSetting('ai', 'customPrompt', e.target.value)}
                      placeholder="Кастомизируйте поведение ИИ..."
                      className="min-h-[200px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Этот промпт будет использоваться как системное сообщение для всех ИИ генераций
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Предварительные настройки
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          updateSetting('ai', 'customPrompt', 'Ты опытный музыкальный продюсер и A&R. Помоги создать детальное описание артиста на основе его имени и контекста. Включи информацию о жанре, локации, предыстории, музыкальном стиле и влияниях.');
                          updateSetting('ai', 'temperature', 0.7);
                        }}
                      >
                        Для артистов
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          updateSetting('ai', 'customPrompt', 'Ты талантливый автор песен и поэт. Создавай креативную и эмоциональную лирику на основе заданной темы, настроения и стиля.');
                          updateSetting('ai', 'temperature', 0.8);
                        }}
                      >
                        Для лирики
                      </Button>
                      <Button
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          updateSetting('ai', 'customPrompt', 'Ты креативный маркетолог в музыкальной индустрии. Создавай привлекательные маркетинговые материалы, описания релизов и промо-тексты.');
                          updateSetting('ai', 'temperature', 0.6);
                        }}
                      >
                        Для маркетинга
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave('ИИ')}>
                <Save className="mr-2 h-4 w-4" />
                Сохранить настройки ИИ
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