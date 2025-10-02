import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Music, Clock, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSunoStatusPolling } from "../hooks/useSunoStatusPolling";
import { BUCKET_AUDIO, buildStoragePath } from "@/lib/storage/constants";

interface UploadExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; name: string }>;
  artists: Array<{ id: string; name: string }>;
}

interface UploadExtendParams {
  uploadUrl: string;
  continueAt: number;
  prompt?: string;
  style: string;
  title: string;
  model: string;
  defaultParamFlag: boolean;
  instrumental: boolean;
  negativeTags?: string;
  vocalGender?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  projectId?: string;
  artistId?: string;
}

export function UploadExtendDialog({ 
  open, 
  onOpenChange, 
  projects, 
  artists 
}: UploadExtendDialogProps) {
  const { toast } = useToast();

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form State
  const [continueAt, setContinueAt] = useState([60]);
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Современная музыка");
  const [title, setTitle] = useState("Extended Track");
  const [model, setModel] = useState("V3_5");
  const [defaultParamFlag, setDefaultParamFlag] = useState(true);
  const [instrumental, setInstrumental] = useState(false);
  const [negativeTags, setNegativeTags] = useState("");
  const [vocalGender, setVocalGender] = useState<string>("");
  const [styleWeight, setStyleWeight] = useState([0.65]);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState([0.65]);
  const [audioWeight, setAudioWeight] = useState([0.65]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");

  // Polling state
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { data: pollingData, isPolling } = useSunoStatusPolling({
    taskId: currentTaskId || "",
    enabled: !!currentTaskId,
    onComplete: (data) => {
      setIsGenerating(false);
      setCurrentTaskId(null);
      toast({
        title: "Расширение завершено!",
        description: `Создано ${data.track ? 1 : 0} варианта трека`
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      setIsGenerating(false);
      setCurrentTaskId(null);
      toast({
        title: "Ошибка расширения",
        description: error,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Неверный тип файла",
        description: "Пожалуйста, выберите аудио файл",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Файл слишком большой",
        description: "Максимальный размер файла 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get current user for path building
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate safe filename using storage utilities
      const fileExt = file.name.split('.').pop() || 'mp3';
      const fileName = `upload-extend-${Date.now()}.${fileExt}`;
      const filePath = buildStoragePath(user.id, 'suno', 'upload-extend', fileName);

      // Upload to Supabase Storage using constant
      const { data, error } = await supabase.storage
        .from(BUCKET_AUDIO)
        .upload(filePath, file, {
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_AUDIO)
        .getPublicUrl(filePath);

      setUploadedFileUrl(publicUrl);
      setUploadProgress(100);
      
      toast({
        title: "Файл загружен",
        description: "Аудио файл успешно загружен"
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить файл",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadedFileUrl) {
      toast({
        title: "Загрузите файл",
        description: "Необходимо загрузить аудио файл для расширения",
        variant: "destructive"
      });
      return;
    }

    if (defaultParamFlag && (!style || !title)) {
      toast({
        title: "Заполните обязательные поля",
        description: "Стиль и название обязательны в пользовательском режиме",
        variant: "destructive"
      });
      return;
    }

    if (defaultParamFlag && !instrumental && !prompt) {
      toast({
        title: "Введите текст",
        description: "Для трека с вокалом необходимо ввести текст",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const params: UploadExtendParams = {
        uploadUrl: uploadedFileUrl,
        continueAt: continueAt[0],
        style,
        title,
        model,
        defaultParamFlag,
        instrumental,
        projectId: selectedProjectId || undefined,
        artistId: selectedArtistId || undefined
      };

      if (defaultParamFlag) {
        if (prompt) params.prompt = prompt;
        if (negativeTags) params.negativeTags = negativeTags;
        if (vocalGender) params.vocalGender = vocalGender;
        if (styleWeight[0] !== 0.65) params.styleWeight = styleWeight[0];
        if (weirdnessConstraint[0] !== 0.65) params.weirdnessConstraint = weirdnessConstraint[0];
        if (audioWeight[0] !== 0.65) params.audioWeight = audioWeight[0];
      }

      console.log('Upload-Extend parameters:', params);

      const { data, error } = await supabase.functions.invoke('upload-extend-suno-track', {
        body: params
      });

      if (error) throw error;

      const taskId = data.taskId;
      setCurrentTaskId(taskId);
      
      toast({
        title: "Расширение началось",
        description: "Ваш трек обрабатывается..."
      });

    } catch (error: any) {
      console.error('Upload-extend error:', error);
      setIsGenerating(false);
      toast({
        title: "Ошибка расширения",
        description: error.message || "Не удалось начать расширение трека",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setUploadedFileUrl("");
    setUploadProgress(0);
    setContinueAt([60]);
    setPrompt("");
    setStyle("Современная музыка");
    setTitle("Extended Track");
    setModel("V3_5");
    setDefaultParamFlag(true);
    setInstrumental(false);
    setNegativeTags("");
    setVocalGender("");
    setStyleWeight([0.65]);
    setWeirdnessConstraint([0.65]);
    setAudioWeight([0.65]);
    setSelectedProjectId("");
    setSelectedArtistId("");
  };

  const handleClose = () => {
    if (!isGenerating) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload & Extend
          </DialogTitle>
          <DialogDescription>
            Загрузите аудио файл и продолжите его с помощью Suno AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <Card>
            <CardContent className="pt-6">
              <Label className="text-sm font-medium">Аудио файл</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Поддерживаются: MP3, WAV, FLAC. Максимум 2 минуты.
              </p>
              
              {!uploadedFileUrl ? (
                <div className="border-dashed border-2 border-muted-foreground/25 p-6 text-center rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    disabled={isUploading}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Music className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {isUploading ? `Загрузка ${uploadProgress}%` : "Выберите аудио файл"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Перетащите файл или нажмите для выбора
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Файл загружен</span>
                    <Badge variant="outline">Готов</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFileUrl("")}
                    disabled={isGenerating}
                  >
                    Изменить
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extension Point */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label className="text-sm font-medium">Точка продолжения</Label>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 сек</span>
                  <span>{continueAt[0]} сек</span>
                  <span>120 сек</span>
                </div>
                <Slider
                  value={continueAt}
                  onValueChange={setContinueAt}
                  max={120}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  С какой секунды продолжить генерацию
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generation Settings */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Label className="text-sm font-medium">Параметры генерации</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Стиль</Label>
                  <Input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Описание стиля"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <Label className="text-xs">Название</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название трека"
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Модель</Label>
                <Select value={model} onValueChange={setModel} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V3">V3 - Базовая (макс 2 мин)</SelectItem>
                    <SelectItem value="V3_5">V3.5 - Улучшенная структура (макс 4 мин)</SelectItem>
                    <SelectItem value="V4">V4 - Качество вокала (макс 4 мин)</SelectItem>
                    <SelectItem value="V4_5">V4.5 - Умные промпты (макс 8 мин)</SelectItem>
                    <SelectItem value="V4_5PLUS">V4.5+ - Богатый звук (макс 8 мин)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                  disabled={isGenerating}
                />
                <Label className="text-xs">Инструментальная версия</Label>
              </div>

              {!instrumental && (
                <div>
                  <Label className="text-xs">Текст для продолжения</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Введите текст, который будет добавлен к треку..."
                    className="min-h-[80px]"
                    disabled={isGenerating}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Context */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label className="text-sm font-medium">Контекст проекта</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Проект</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите проект" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Без проекта</SelectItem>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Артист</Label>
                  <Select value={selectedArtistId} onValueChange={setSelectedArtistId} disabled={isGenerating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите артиста" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Без артиста</SelectItem>
                      {artists.map(artist => (
                        <SelectItem key={artist.id} value={artist.id}>
                          {artist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {isGenerating && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Генерация в процессе...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPolling ? "Обрабатываем ваш трек с помощью Suno AI" : "Отправляем запрос..."}
                </p>
                {currentTaskId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Task ID: {currentTaskId}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-orange-700 dark:text-orange-300">
              <p className="font-medium mb-1">Важно:</p>
              <ul className="space-y-1">
                <li>• Длительность исходного файла не должна превышать 2 минуты</li>
                <li>• Генерация может занять 1-3 минуты</li>
                <li>• Будет создано 2 варианта расширения</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isGenerating}
            >
              {isGenerating ? "Генерация..." : "Отмена"}
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={!uploadedFileUrl || isGenerating}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isGenerating ? "Расширяем..." : "Расширить трек"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}