import { useState, useEffect } from "react";
import { User, Bell, Palette, Shield, Database, Save, Bot, ChevronRight, Moon, Sun, Mail, MessageCircle, Link, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { MobilePageWrapper } from "@/components/mobile/MobilePageWrapper";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description?: string;
  type: 'switch' | 'text' | 'button' | 'link';
  value?: any;
  action?: () => void;
}

export default function MobileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isInTelegram } = useTelegramWebApp();
  const { authData } = useTelegramAuth();
  
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
      darkMode: theme === 'dark'
    },
    connections: {
      emailLinked: !!user?.email,
      telegramLinked: !!authData
    }
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Синхронизация темы с настройками
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        darkMode: theme === 'dark'
      }
    }));
  }, [theme]);

  // Функции для привязки аккаунтов
  const linkEmail = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите email адрес",
        variant: "destructive"
      });
      return;
    }

    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-account', {
        body: {
          provider: 'email',
          credentials: { email: newEmail.trim() }
        }
      });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        connections: { ...prev.connections, emailLinked: true }
      }));

      toast({
        title: "Успешно",
        description: "Email привязан к аккаунту"
      });
      setNewEmail("");
    } catch (error: any) {
      console.error('Error linking email:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось привязать email",
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  const linkTelegram = async () => {
    if (!isInTelegram || !authData) {
      toast({
        title: "Ошибка",
        description: "Telegram аккаунт доступен только внутри Telegram",
        variant: "destructive"
      });
      return;
    }

    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-account', {
        body: {
          provider: 'telegram',
          credentials: {
            telegram_id: authData?.id?.toString(),
            telegram_username: authData?.email,
            telegram_first_name: authData?.user_metadata?.first_name,
            telegram_last_name: authData?.user_metadata?.last_name
          }
        }
      });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        connections: { ...prev.connections, telegramLinked: true }
      }));

      toast({
        title: "Успешно",
        description: "Telegram аккаунт привязан"
      });
    } catch (error: any) {
      console.error('Error linking Telegram:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось привязать Telegram",
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  const sections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Профиль',
      description: 'Управление информацией профиля',
      icon: <User className="h-5 w-5" />,
      items: [
        {
          id: 'displayName',
          title: 'Отображаемое имя',
          type: 'text',
          value: settings.profile.displayName
        },
        {
          id: 'bio',
          title: 'Биография',
          type: 'text',
          value: settings.profile.bio
        },
        {
          id: 'avatarUrl',
          title: 'URL аватара',
          type: 'text',
          value: settings.profile.avatarUrl
        }
      ]
    },
    {
      id: 'connections',
      title: 'Привязка аккаунтов',
      description: 'Управление связанными аккаунтами',
      icon: <Link className="h-5 w-5" />,
      items: [
        {
          id: 'emailConnection',
          title: 'Привязать Email',
          description: settings.connections.emailLinked ? 
            `Привязан: ${user?.email}` : 
            'Email не привязан',
          type: 'button',
          action: () => {
            if (!settings.connections.emailLinked) {
              // Открываем форму привязки email
            } else {
              toast({
                title: "Email уже привязан",
                description: "Ваш email уже привязан к аккаунту"
              });
            }
          }
        },
        {
          id: 'telegramConnection',
          title: 'Привязать Telegram',
          description: settings.connections.telegramLinked ? 
            `Привязан: ${authData?.email || 'Unknown'}` : 
            isInTelegram ? 'Доступно для привязки' : 'Доступно только в Telegram',
          type: 'button',
          action: linkTelegram
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      description: 'Настройка уведомлений',
      icon: <Bell className="h-5 w-5" />,
      items: [
        {
          id: 'emailNotifications',
          title: 'Email уведомления',
          description: 'Получать уведомления по электронной почте',
          type: 'switch',
          value: settings.notifications.emailNotifications
        },
        {
          id: 'pushNotifications',
          title: 'Push уведомления',
          description: 'Получать push-уведомления в браузере',
          type: 'switch',
          value: settings.notifications.pushNotifications
        },
        {
          id: 'aiGenerationComplete',
          title: 'ИИ генерация завершена',
          description: 'Уведомлять когда генерация музыки ИИ завершена',
          type: 'switch',
          value: settings.notifications.aiGenerationComplete
        },
        {
          id: 'projectUpdates',
          title: 'Обновления проектов',
          description: 'Уведомлять об изменениях проектов',
          type: 'switch',
          value: settings.notifications.projectUpdates
        },
        {
          id: 'weeklyDigest',
          title: 'Еженедельная сводка',
          description: 'Получать еженедельную сводку активности',
          type: 'switch',
          value: settings.notifications.weeklyDigest
        }
      ]
    },
    {
      id: 'preferences',
      title: 'Предпочтения',
      description: 'Настройки приложения',
      icon: <Palette className="h-5 w-5" />,
      items: [
        {
          id: 'autoSaveProjects',
          title: 'Автосохранение проектов',
          description: 'Автоматически сохранять изменения в проектах',
          type: 'switch',
          value: settings.preferences.autoSaveProjects
        },
        {
          id: 'darkMode',
          title: 'Темная тема',
          description: 'Использовать темную тему в приложении',
          type: 'switch',
          value: settings.preferences.darkMode
        }
      ]
    },
    {
      id: 'ai',
      title: 'Настройки ИИ',
      description: 'Конфигурация ИИ сервисов',
      icon: <Bot className="h-5 w-5" />,
      items: [
        {
          id: 'aiSettings',
          title: 'Настройки ИИ',
          description: 'Конфигурация промптов и моделей',
          type: 'button',
          action: () => {
            toast({
              title: "В разработке",
              description: "Настройки ИИ скоро будут доступны"
            });
          }
        }
      ]
    },
    {
      id: 'security',
      title: 'Безопасность',
      description: 'Управление безопасностью аккаунта',
      icon: <Shield className="h-5 w-5" />,
      items: [
        {
          id: 'changePassword',
          title: 'Изменить пароль',
          type: 'button',
          action: () => {
            toast({
              title: "В разработке",
              description: "Смена пароля скоро будет доступна"
            });
          }
        },
        {
          id: 'exportData',
          title: 'Экспорт данных',
          description: 'Скачать копию ваших данных',
          type: 'button',
          action: () => {
            toast({
              title: "В разработке",
              description: "Экспорт данных скоро будет доступен"
            });
          }
        },
        {
          id: 'deleteAccount',
          title: 'Удалить аккаунт',
          description: 'Навсегда удалить ваш аккаунт',
          type: 'button',
          action: () => {
            toast({
              title: "Внимание",
              description: "Функция удаления аккаунта в разработке",
              variant: "destructive"
            });
          }
        }
      ]
    }
  ];

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    setSectionOpen(true);
  };

  const handleSettingChange = (sectionId: string, itemId: string, value: any) => {
    // Специальная обработка переключения темы
    if (itemId === 'darkMode') {
      setTheme(value ? 'dark' : 'light');
    }
    
    setSettings(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId as keyof typeof prev],
        [itemId]: value
      }
    }));
  };

  const handleSave = (sectionId: string) => {
    toast({
      title: "Настройки сохранены",
      description: `Ваши настройки были обновлены.`,
    });
    setSectionOpen(false);
  };

  const getActiveSection = () => {
    return sections.find(section => section.id === activeSection);
  };

  if (!user) {
    return (
      <MobilePageWrapper>
        <MobileCard className="text-center">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Требуется вход</h3>
            <p className="text-muted-foreground">Войдите, чтобы настроить приложение.</p>
          </div>
        </MobileCard>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Profile Header */}
      <MobileCard className="mb-6">
        <div className="flex items-center gap-4 p-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={settings.profile.avatarUrl} />
            <AvatarFallback className="text-lg">
              {user.email?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {settings.profile.displayName || user.email}
            </h2>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
            {settings.profile.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {settings.profile.bio}
              </p>
            )}
          </div>
        </div>
      </MobileCard>

      {/* Settings Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <MobileCard
            key={section.id}
            interactive
            onClick={() => handleSectionClick(section.id)}
            className="p-0"
          >
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </MobileCard>
        ))}
      </div>

      {/* Settings Section Bottom Sheet */}
      <MobileBottomSheet
        isOpen={sectionOpen}
        onClose={() => setSectionOpen(false)}
        title={getActiveSection()?.title}
        height="auto"
      >
        {getActiveSection() && (
          <div className="p-4 space-y-6">
            {/* Специальная обработка для привязки email */}
            {getActiveSection()!.id === 'connections' && (
              <div className="space-y-4">
                {/* Email Connection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Email</Label>
                    {settings.connections.emailLinked && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  {settings.connections.emailLinked ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ Привязан: {user?.email}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Введите email адрес"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        type="email"
                      />
                      <Button 
                        onClick={linkEmail}
                        disabled={isLinking || !newEmail.trim()}
                        size="sm"
                        className="w-full"
                      >
                        {isLinking ? "Привязка..." : "Привязать Email"}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Telegram Connection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Telegram</Label>
                    {settings.connections.telegramLinked && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  {settings.connections.telegramLinked ? (
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ Привязан: {authData?.email || 'Unknown'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {isInTelegram 
                          ? "Привяжите ваш Telegram аккаунт для получения уведомлений" 
                          : "Доступно только при использовании внутри Telegram"
                        }
                      </p>
                      <Button 
                        onClick={linkTelegram}
                        disabled={isLinking || !isInTelegram}
                        size="sm"
                        className="w-full"
                      >
                        {isLinking ? "Привязка..." : "Привязать Telegram"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Обычные настройки */}
            {getActiveSection()!.id !== 'connections' && getActiveSection()!.items.map((item) => (
              <div key={item.id} className="space-y-2">
                {item.type === 'switch' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={item.id} className="text-sm font-medium">
                        {item.title}
                      </Label>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={item.id}
                      checked={item.value}
                      onCheckedChange={(checked) => 
                        handleSettingChange(getActiveSection()!.id, item.id, checked)
                      }
                    />
                  </div>
                )}

                {item.type === 'text' && (
                  <div className="space-y-2">
                    <Label htmlFor={item.id} className="text-sm font-medium">
                      {item.title}
                    </Label>
                    {item.id === 'bio' ? (
                      <Textarea
                        id={item.id}
                        value={item.value}
                        onChange={(e) => 
                          handleSettingChange(getActiveSection()!.id, item.id, e.target.value)
                        }
                        placeholder={`Введите ${item.title.toLowerCase()}...`}
                        className="resize-none"
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={item.id}
                        value={item.value}
                        onChange={(e) => 
                          handleSettingChange(getActiveSection()!.id, item.id, e.target.value)
                        }
                        placeholder={`Введите ${item.title.toLowerCase()}...`}
                      />
                    )}
                  </div>
                )}

                {item.type === 'button' && (
                  <div className="space-y-2">
                    <Button
                      variant={item.id === 'deleteAccount' ? 'destructive' : 'outline'}
                      onClick={item.action}
                      className="w-full justify-start"
                    >
                      {item.title}
                    </Button>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                )}

                {item !== getActiveSection()!.items[getActiveSection()!.items.length - 1] && (
                  <Separator />
                )}
              </div>
            ))}

            {getActiveSection()!.id !== 'security' && getActiveSection()!.id !== 'connections' && (
              <Button 
                onClick={() => handleSave(getActiveSection()!.id)} 
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                Сохранить изменения
              </Button>
            )}
          </div>
        )}
      </MobileBottomSheet>
    </MobilePageWrapper>
  );
}