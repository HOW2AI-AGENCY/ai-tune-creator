import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Sparkles,
  Loader2,
  FileText,
  MessageSquare
} from "lucide-react";

interface PromptProfile {
  id: string;
  name: string;
  description: string;
  service: 'suno' | 'mureka' | 'both';
  style_template: string;
  genre_tags: string[];
  voice_style?: string;
  language?: string;
  tempo?: string;
  is_active: boolean;
}

export function AIPromptSettings() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PromptProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    service: "both" as 'suno' | 'mureka' | 'both',
    style_template: "",
    genre_tags: [] as string[],
    voice_style: "",
    language: "ru",
    tempo: "",
  });

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', 'ai_prompts')
        .eq('user_id', user?.id);

      if (error) throw error;

      const profilesData = data?.map(item => ({
        id: item.id,
        ...(item.value as any),
      })) || [];

      setProfiles(profilesData);
    } catch (error: any) {
      console.error('Error loading prompt profiles:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить профили промптов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Ошибка валидации",
        description: "Название профиля обязательно",
        variant: "destructive"
      });
      return;
    }

    try {
      const profileData = {
        name: formData.name,
        description: formData.description,
        service: formData.service,
        style_template: formData.style_template,
        genre_tags: formData.genre_tags,
        voice_style: formData.voice_style,
        language: formData.language,
        tempo: formData.tempo,
        is_active: false
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('user_settings')
          .update({
            value: profileData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Профиль обновлен",
          description: "Настройки промпта успешно сохранены"
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('user_settings')
          .insert({
            user_id: user?.id,
            category: 'ai_prompts',
            key: `prompt_profile_${Date.now()}`,
            value: profileData
          });

        if (error) throw error;

        toast({
          title: "Профиль создан",
          description: "Новый профиль промпта добавлен"
        });
      }

      setEditingId(null);
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        service: "both",
        style_template: "",
        genre_tags: [],
        voice_style: "",
        language: "ru",
        tempo: "",
      });
      loadProfiles();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить профиль",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (profile: PromptProfile) => {
    setFormData({
      name: profile.name,
      description: profile.description,
      service: profile.service,
      style_template: profile.style_template,
      genre_tags: profile.genre_tags,
      voice_style: profile.voice_style || "",
      language: profile.language || "ru",
      tempo: profile.tempo || "",
    });
    setEditingId(profile.id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Профиль удален",
        description: "Профиль промпта был удален"
      });
      loadProfiles();
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить профиль",
        variant: "destructive"
      });
    }
  };

  const handleActivate = async (id: string) => {
    try {
      // Deactivate all profiles first
      const allProfiles = await supabase
        .from('user_settings')
        .select('*')
        .eq('category', 'ai_prompts')
        .eq('user_id', user?.id);

      for (const profile of allProfiles.data || []) {
        await supabase
          .from('user_settings')
          .update({
            value: { ...(profile.value as any), is_active: false }
          })
          .eq('id', profile.id);
      }

      // Then activate the selected one
      const profile = profiles.find(p => p.id === id);
      if (profile) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            value: {
              ...(profile as any),
              is_active: true
            }
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Профиль активирован",
          description: "Этот профиль будет использоваться по умолчанию"
        });
        loadProfiles();
      }
    } catch (error: any) {
      console.error('Error activating profile:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось активировать профиль",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Профили промптов AI</h2>
          <p className="text-muted-foreground">
            Управляйте шаблонами промптов для генерации музыки
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Новый профиль
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {editingId ? 'Редактировать профиль' : 'Новый профиль'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название профиля</Label>
                <Input
                  placeholder="Название профиля"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>AI Сервис</Label>
                <Select 
                  value={formData.service} 
                  onValueChange={(value: 'suno' | 'mureka' | 'both') => 
                    setFormData(prev => ({ ...prev, service: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Оба сервиса</SelectItem>
                    <SelectItem value="suno">Только Suno</SelectItem>
                    <SelectItem value="mureka">Только Mureka</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Input
                placeholder="Краткое описание профиля"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Шаблон стиля</Label>
              <Textarea
                placeholder="Шаблон промпта для стиля музыки. Используйте {genre}, {mood} для подстановки значений."
                value={formData.style_template}
                onChange={(e) => setFormData(prev => ({ ...prev, style_template: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Стиль голоса</Label>
                <Input
                  placeholder="male, female, energetic..."
                  value={formData.voice_style}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice_style: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Язык</Label>
                <Select 
                  value={formData.language} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="auto">Авто</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Темп</Label>
                <Input
                  placeholder="fast, slow, medium..."
                  value={formData.tempo}
                  onChange={(e) => setFormData(prev => ({ ...prev, tempo: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingId(null);
                  setFormData({
                    name: "",
                    description: "",
                    service: "both",
                    style_template: "",
                    genre_tags: [],
                    voice_style: "",
                    language: "ru",
                    tempo: "",
                  });
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет профилей промптов</h3>
            <p className="text-muted-foreground text-center mb-4">
              Создайте первый профиль для управления шаблонами AI генерации
            </p>
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать профиль
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      {profile.name}
                      {profile.is_active && (
                        <Badge variant="default" className="text-xs">
                          Активный
                        </Badge>
                      )}
                    </CardTitle>
                    {profile.description && (
                      <p className="text-sm text-muted-foreground">
                        {profile.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {profile.service === 'both' ? 'Все' : profile.service}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Шаблон стиля:
                  </Label>
                  <p className="mt-1 text-sm line-clamp-3">
                    {profile.style_template}
                  </p>
                </div>

                {profile.genre_tags && profile.genre_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {profile.genre_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {!profile.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActivate(profile.id)}
                      className="flex-1"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Активировать
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(profile)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(profile.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}