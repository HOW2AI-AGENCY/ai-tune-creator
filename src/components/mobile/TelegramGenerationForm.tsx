import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTelegramWebApp, useTelegramMainButton, useTelegramBackButton } from "@/hooks/useTelegramWebApp";
import { Wand2, Music, Mic, Clock, Volume2, Languages, Tag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationFormData {
  prompt: string;
  lyrics?: string;
  title?: string;
  genre: string;
  mood: string;
  duration: number;
  tempo: number;
  instrumental: boolean;
  language: string;
  voice_style?: string;
  tags: string[];
}

interface TelegramGenerationFormProps {
  onGenerate: (data: GenerationFormData) => void;
  onCancel: () => void;
  isGenerating?: boolean;
  className?: string;
}

const GENRE_OPTIONS = [
  { value: "pop", label: "Pop", emoji: "🎵" },
  { value: "rock", label: "Rock", emoji: "🎸" },
  { value: "electronic", label: "Electronic", emoji: "🎛️" },
  { value: "hip-hop", label: "Hip-Hop", emoji: "🎤" },
  { value: "jazz", label: "Jazz", emoji: "🎺" },
  { value: "classical", label: "Classical", emoji: "🎼" },
  { value: "folk", label: "Folk", emoji: "🪕" },
  { value: "blues", label: "Blues", emoji: "🎶" }
];

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "energetic", label: "Energetic", emoji: "⚡" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "romantic", label: "Romantic", emoji: "💕" },
  { value: "mysterious", label: "Mysterious", emoji: "🌙" },
  { value: "epic", label: "Epic", emoji: "⚔️" },
  { value: "nostalgic", label: "Nostalgic", emoji: "🌅" }
];

const VOICE_STYLES = [
  { value: "male", label: "Male Voice" },
  { value: "female", label: "Female Voice" },
  { value: "child", label: "Child Voice" },
  { value: "elderly", label: "Elderly Voice" }
];

const POPULAR_TAGS = [
  "acoustic", "ambient", "anthemic", "atmospheric", "bass-heavy",
  "catchy", "chill", "dark", "dreamy", "groovy", "heavy", "melodic",
  "minimalist", "nostalgic", "psychedelic", "rhythmic", "soulful", "uplifting"
];

export function TelegramGenerationForm({ 
  onGenerate, 
  onCancel, 
  isGenerating = false,
  className 
}: TelegramGenerationFormProps) {
  const { isInTelegram, colorScheme } = useTelegramWebApp();
  const { showMainButton, hideMainButton } = useTelegramMainButton();
  const { showBackButton, hideBackButton } = useTelegramBackButton();

  const [formData, setFormData] = useState<GenerationFormData>({
    prompt: "",
    lyrics: "",
    title: "",
    genre: "pop",
    mood: "happy",
    duration: 120,
    tempo: 120,
    instrumental: false,
    language: "en",
    voice_style: "female",
    tags: []
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [customTag, setCustomTag] = useState("");

  const STEPS = [
    { title: "Basic Info", icon: Music },
    { title: "Style & Mood", icon: Sparkles },
    { title: "Audio Settings", icon: Volume2 },
    { title: "Final Details", icon: Tag }
  ];

  const handleGenerate = () => {
    if (formData.prompt.trim().length > 0) {
      onGenerate(formData);
    }
  };

  // Telegram button integration with improved lifecycle
  useEffect(() => {
    if (isInTelegram) {
      const isLastStep = currentStep >= STEPS.length - 1;
      const canGenerate = formData.prompt.trim().length > 0;
      
      if (isGenerating) {
        // During generation, show progress
        showMainButton("Generating...", () => {});
      } else if (isLastStep && canGenerate) {
        // Final step - enable generate button
        showMainButton("🎵 Create Music", handleGenerate);
      } else if (isLastStep) {
        // Final step but can't generate
        showMainButton("Add description first", () => {});
      } else {
        // Navigation steps
        showMainButton("Next →", () => setCurrentStep(prev => prev + 1));
      }

      // Back button with smart behavior
      showBackButton(() => {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        } else {
          onCancel();
        }
      });

      return () => {
        hideMainButton();
        hideBackButton();
      };
    }
  }, [isInTelegram, currentStep, formData.prompt, isGenerating, showMainButton, hideMainButton, showBackButton, hideBackButton, handleGenerate, onCancel]);

  const updateFormData = (updates: Partial<GenerationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      updateFormData({ tags: [...formData.tags, tag] });
    }
  };

  const removeTag = (tag: string) => {
    updateFormData({ tags: formData.tags.filter(t => t !== tag) });
  };

  const addCustomTag = () => {
    if (customTag.trim() && !formData.tags.includes(customTag.trim())) {
      addTag(customTag.trim());
      setCustomTag("");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="prompt" className="text-base font-medium">
                Describe your music *
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Tell us what kind of music you want to create
              </p>
              <Textarea
                id="prompt"
                placeholder="e.g., A cheerful pop song about summer vacation with upbeat rhythms..."
                value={formData.prompt}
                onChange={(e) => updateFormData({ prompt: e.target.value })}
                className="min-h-24"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.prompt.length}/500 characters
              </p>
            </div>

            <div>
              <Label htmlFor="title" className="text-base font-medium">
                Song Title
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Optional - we'll generate one if empty
              </p>
              <Input
                id="title"
                placeholder="My Amazing Song"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="lyrics" className="text-base font-medium">
                Custom Lyrics
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Optional - leave empty for AI-generated lyrics
              </p>
              <Textarea
                id="lyrics"
                placeholder="[Verse 1]&#10;Your custom lyrics here...&#10;&#10;[Chorus]&#10;..."
                value={formData.lyrics}
                onChange={(e) => updateFormData({ lyrics: e.target.value })}
                className="min-h-32"
                maxLength={2000}
              />
            </div>
          </div>
        );

      case 1: // Style & Mood
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">
                Choose Genre
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {GENRE_OPTIONS.map((genre) => (
                  <Card
                    key={genre.value}
                    className={cn(
                      "p-4 cursor-pointer transition-all border-2",
                      formData.genre === genre.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateFormData({ genre: genre.value })}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{genre.emoji}</div>
                      <div className="font-medium">{genre.label}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">
                Mood & Feel
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <Card
                    key={mood.value}
                    className={cn(
                      "p-4 cursor-pointer transition-all border-2",
                      formData.mood === mood.value 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => updateFormData({ mood: mood.value })}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{mood.emoji}</div>
                      <div className="font-medium">{mood.label}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Audio Settings
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">
                Duration: {Math.floor(formData.duration / 60)}:{(formData.duration % 60).toString().padStart(2, '0')}
              </Label>
              <Slider
                value={[formData.duration]}
                onValueChange={([value]) => updateFormData({ duration: value })}
                min={30}
                max={300}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>30s</span>
                <span>5:00</span>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">
                Tempo: {formData.tempo} BPM
              </Label>
              <Slider
                value={[formData.tempo]}
                onValueChange={([value]) => updateFormData({ tempo: value })}
                min={60}
                max={200}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>60 BPM (Slow)</span>
                <span>200 BPM (Fast)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <Label className="text-base font-medium">Instrumental Only</Label>
                <p className="text-sm text-muted-foreground">No vocals, music only</p>
              </div>
              <Switch
                checked={formData.instrumental}
                onCheckedChange={(checked) => updateFormData({ instrumental: checked })}
              />
            </div>

            {!formData.instrumental && (
              <>
                <div>
                  <Label className="text-base font-medium mb-3 block">Voice Style</Label>
                  <Select value={formData.voice_style} onValueChange={(value) => updateFormData({ voice_style: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-medium mb-3 block">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => updateFormData({ language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );

      case 3: // Final Details
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">Style Tags</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Add tags to refine your music style
              </p>
              
              {/* Selected tags */}
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}

              {/* Popular tags */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {POPULAR_TAGS.filter(tag => !formData.tags.includes(tag)).slice(0, 12).map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                    className="text-xs justify-start"
                  >
                    + {tag}
                  </Button>
                ))}
              </div>

              {/* Custom tag input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Custom tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={addCustomTag}
                  disabled={!customTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Summary */}
            <Card className="p-4 bg-muted/30">
              <h4 className="font-medium mb-3">Generation Summary</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Genre:</span> {formData.genre}</div>
                <div><span className="text-muted-foreground">Mood:</span> {formData.mood}</div>
                <div><span className="text-muted-foreground">Duration:</span> {Math.floor(formData.duration / 60)}:{(formData.duration % 60).toString().padStart(2, '0')}</div>
                <div><span className="text-muted-foreground">Tempo:</span> {formData.tempo} BPM</div>
                <div><span className="text-muted-foreground">Type:</span> {formData.instrumental ? 'Instrumental' : 'With vocals'}</div>
                {formData.tags.length > 0 && (
                  <div><span className="text-muted-foreground">Tags:</span> {formData.tags.join(', ')}</div>
                )}
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isInTelegram && "pt-safe-area-inset-top pb-safe-area-inset-bottom",
      className
    )}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Create Music</h1>
            <div className="text-sm text-muted-foreground">
              {currentStep + 1} / {STEPS.length}
            </div>
          </div>
          
          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={index} className="flex items-center flex-1">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-muted-foreground/30"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2",
                      isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{STEPS[currentStep].title}</h2>
        </div>
        
        {renderStepContent()}
      </div>

      {/* Non-Telegram navigation */}
      {!isInTelegram && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep > 0) {
                  setCurrentStep(prev => prev - 1);
                } else {
                  onCancel();
                }
              }}
              className="flex-1"
            >
              {currentStep > 0 ? "Back" : "Cancel"}
            </Button>
            
            <Button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(prev => prev + 1);
                } else {
                  handleGenerate();
                }
              }}
              disabled={currentStep === STEPS.length - 1 && (formData.prompt.trim().length === 0 || isGenerating)}
              className="flex-1"
            >
              {isGenerating && <Wand2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentStep < STEPS.length - 1 ? "Next" : "Generate Music"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}