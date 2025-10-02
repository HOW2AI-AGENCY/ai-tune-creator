import React, { useState, memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Music, 
  Mic, 
  Wand2, 
  Upload, 
  Scissors, 
  Video, 
  FileAudio,
  FileText,
  Sparkles,
  Layers,
  RefreshCw,
  Download,
  Play,
  Pause,
  Volume2,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

import { sunoService } from '@/lib/ai-services/suno-complete-service';
import { murekaService } from '@/lib/ai-services/mureka-complete-service';

type AIService = 'suno' | 'mureka' | 'sonauto' | 'udio';
type GenerationMode = 'generate' | 'cover' | 'extend' | 'remix' | 'stems' | 'instrumental' | 'vocals' | 'master';

interface ServiceCapabilities {
  generate: boolean;
  cover: boolean;
  extend: boolean;
  remix: boolean;
  stems: boolean;
  instrumental: boolean;
  vocals: boolean;
  lyrics: boolean;
  video: boolean;
  master: boolean;
  styleTransfer: boolean;
  vocalClone: boolean;
}

const SERVICE_CAPABILITIES: Record<AIService, ServiceCapabilities> = {
  suno: {
    generate: true,
    cover: true,
    extend: true,
    remix: true,
    stems: true,
    instrumental: true,
    vocals: true,
    lyrics: true,
    video: true,
    master: false,
    styleTransfer: false,
    vocalClone: false
  },
  mureka: {
    generate: true,
    cover: true,
    extend: true,
    remix: true,
    stems: true,
    instrumental: true,
    vocals: true,
    lyrics: true,
    video: false,
    master: true,
    styleTransfer: true,
    vocalClone: true
  },
  sonauto: {
    generate: true,
    cover: false,
    extend: false,
    remix: false,
    stems: false,
    instrumental: false,
    vocals: false,
    lyrics: true,
    video: false,
    master: false,
    styleTransfer: false,
    vocalClone: false
  },
  udio: {
    generate: true,
    cover: true,
    extend: true,
    remix: true,
    stems: false,
    instrumental: true,
    vocals: false,
    lyrics: false,
    video: false,
    master: true,
    styleTransfer: true,
    vocalClone: false
  }
};

export const UniversalAIInterface = memo(function UniversalAIInterface() {
  const [selectedService, setSelectedService] = useState<AIService>('suno');
  const [selectedMode, setSelectedMode] = useState<GenerationMode>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [naturalLanguageMode, setNaturalLanguageMode] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // Form states
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [model, setModel] = useState('auto');
  const [instrumental, setInstrumental] = useState(false);
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState('');
  const [tempo, setTempo] = useState(120);
  const [userExperience, setUserExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  
  // Refs for accessibility
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  
  const { toast } = useToast();
  
  // Smart suggestions based on input
  const generateSuggestions = useCallback((input: string) => {
    const suggestions = [
      'A chill lo-fi hip hop beat with jazz samples',
      'Energetic electronic dance music with heavy bass',
      'Acoustic folk song with emotional vocals',
      'Dark ambient instrumental with cinematic elements',
      'Upbeat pop song with catchy chorus'
    ];
    
    if (input.length > 10) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(input.toLowerCase().split(' ')[0])
      );
      setAiSuggestions(filtered.length > 0 ? filtered.slice(0, 3) : suggestions.slice(0, 3));
    } else {
      setAiSuggestions(suggestions.slice(0, 3));
    }
  }, []);
  
  useEffect(() => {
    if (prompt) {
      generateSuggestions(prompt);
    }
  }, [prompt, generateSuggestions]);

  const capabilities = SERVICE_CAPABILITIES[selectedService];
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating) {
        e.preventDefault();
        // handleGenerate will be defined below
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating]);
  
  // Auto-focus on prompt input when component mounts
  useEffect(() => {
    if (naturalLanguageMode && promptRef.current) {
      promptRef.current.focus();
    }
  }, [naturalLanguageMode]);
  
  // Experience-based defaults
  useEffect(() => {
    if (userExperience === 'beginner') {
      setShowAdvanced(false);
      setNaturalLanguageMode(true);
    } else if (userExperience === 'advanced') {
      setShowAdvanced(true);
    }
  }, [userExperience]);

  const simulateProgress = useCallback(() => {
    const steps = [
      { progress: 10, step: 'Analyzing your description...' },
      { progress: 25, step: 'Generating musical structure...' },
      { progress: 45, step: 'Creating melody and harmony...' },
      { progress: 65, step: 'Adding instruments and effects...' },
      { progress: 85, step: 'Finalizing audio quality...' },
      { progress: 100, step: 'Your music is ready!' }
    ];
    
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setGenerationProgress(steps[currentStep].progress);
        setGenerationStep(steps[currentStep].step);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 2000);
    
    return interval;
  }, []);
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing Description",
        description: "Please describe the music you want to create.",
        variant: "destructive"
      });
      promptRef.current?.focus();
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStep('Preparing generation...');
    
    // Start progress simulation
    const progressInterval = simulateProgress();
    
    try {
      let result;
      
      switch (selectedService) {
        case 'suno':
          switch (selectedMode) {
            case 'generate':
              result = await sunoService.generateMusic({
                prompt,
                lyrics: instrumental ? undefined : lyrics,
                model: model as any,
                instrumental
              });
              break;
            case 'cover':
              if (!uploadedFile) throw new Error('Please upload a file');
              result = await sunoService.uploadAndCover(uploadedFile, prompt);
              break;
            case 'extend':
              if (!uploadedFile) throw new Error('Please upload a file');
              result = await sunoService.uploadAndExtend(uploadedFile, prompt);
              break;
            case 'stems':
              result = await sunoService.separateStems({
                trackId: prompt,
                separationType: 'all'
              });
              break;
          }
          break;
          
        case 'mureka':
          switch (selectedMode) {
            case 'generate':
              result = await murekaService.generateMusic({
                lyrics: lyrics || prompt,
                prompt,
                model: model as any
              });
              break;
            case 'cover':
              if (!uploadedFile) throw new Error('Please upload a file');
              const fileUrl = URL.createObjectURL(uploadedFile);
              result = await murekaService.createCover({
                originalUrl: fileUrl,
                style: prompt
              });
              break;
          }
          break;
      }
      
      // Clear progress interval
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStep('Generation completed successfully!');
      
      toast({
        title: "🎵 Music Generated!",
        description: `Your ${selectedMode} has been created successfully.`,
      });
      
      console.log('Generation result:', result);
      
      // Reset after a delay
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStep('');
      }, 3000);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Generation error:', error);
      
      setGenerationProgress(0);
      setGenerationStep('');
      
      toast({
        title: "❌ Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred during generation",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File Uploaded",
        description: `${file.name} ready for processing`,
      });
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 max-w-6xl">
        {/* Hero Section with Smart Interface Toggle */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              AI Music Generation Studio
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Create professional-quality music using natural language. Just describe what you want, and AI will bring it to life.
          </p>
          
          {/* Experience Level Selector */}
          <div className="flex justify-center gap-2 mt-6">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <Button
                key={level}
                variant={userExperience === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUserExperience(level)}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Smart Generation Interface */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg md:text-xl">What music do you want to create?</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNaturalLanguageMode(!naturalLanguageMode)}
                    >
                      {naturalLanguageMode ? <Brain className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {naturalLanguageMode ? 'Switch to Advanced Mode' : 'Switch to Natural Language'}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <CardDescription>
              {naturalLanguageMode 
                ? "Describe your music in natural language. Be as creative and detailed as you like!"
                : "Configure precise parameters for professional music generation."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Natural Language Input */}
            {naturalLanguageMode && (
              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your music... For example: 'Create a dreamy synthwave track with nostalgic 80s vibes, perfect for late-night drives'"
                    className="min-h-[120px] text-base resize-none border-2 focus:border-primary transition-colors"
                    aria-label="Music description"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                    {prompt.length}/500
                  </div>
                </div>
                
                {/* AI Suggestions */}
                {aiSuggestions.length > 0 && prompt.length < 10 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Suggestions
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => setPrompt(suggestion)}
                          className="text-xs hover:bg-primary/10"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Service Selection with Enhanced UI */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                AI Service
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['suno', 'mureka', 'sonauto', 'udio'] as AIService[]).map((service) => {
                  const isSelected = selectedService === service;
                  const isAvailable = service === 'suno' || service === 'mureka';
                  
                  return (
                    <Tooltip key={service}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => isAvailable && setSelectedService(service)}
                          disabled={!isAvailable}
                          className={`h-20 flex flex-col gap-2 transition-all duration-200 ${
                            isSelected ? 'ring-2 ring-primary/50 shadow-lg' : ''
                          } ${!isAvailable ? 'opacity-50' : 'hover:scale-105'}`}
                        >
                          {service === 'suno' && <Music className="h-6 w-6" />}
                          {service === 'mureka' && <Mic className="h-6 w-6" />}
                          {service === 'sonauto' && <Wand2 className="h-6 w-6" />}
                          {service === 'udio' && <Sparkles className="h-6 w-6" />}
                          <div className="text-xs font-medium capitalize">{service}</div>
                          {!isAvailable && <Badge variant="secondary" className="text-xs">Soon</Badge>}
                          {isAvailable && isSelected && <CheckCircle className="h-3 w-3 text-green-500" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isAvailable ? `Use ${service} for music generation` : `${service} coming soon`}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
            
            {/* Generation Progress */}
            {isGenerating && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Generating your music...</span>
                      <span className="text-sm text-muted-foreground">{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                    {generationStep && (
                      <p className="text-xs text-muted-foreground">{generationStep}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Advanced Options Toggle */}
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-center gap-2 text-sm"
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </CardContent>
        </Card>

        {/* Advanced Options - Collapsible */}
        {showAdvanced && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>
                Fine-tune your generation with professional parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as GenerationMode)}>
                {/* Mode Selection with Icons */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Generation Mode</Label>
                  <TabsList className={`grid ${
                    Object.values(capabilities).filter(Boolean).length <= 4 
                      ? 'grid-cols-4' 
                      : 'grid-cols-4 lg:grid-cols-8'
                  }`}>
                    {capabilities.generate && (
                      <TabsTrigger value="generate" className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden sm:inline">Generate</span>
                      </TabsTrigger>
                    )}
                    {capabilities.cover && (
                      <TabsTrigger value="cover" className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span className="hidden sm:inline">Cover</span>
                      </TabsTrigger>
                    )}
                    {capabilities.extend && (
                      <TabsTrigger value="extend" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span className="hidden sm:inline">Extend</span>
                      </TabsTrigger>
                    )}
                    {capabilities.remix && (
                      <TabsTrigger value="remix" className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        <span className="hidden sm:inline">Remix</span>
                      </TabsTrigger>
                    )}
                    {capabilities.stems && (
                      <TabsTrigger value="stems" className="flex items-center gap-1">
                        <Scissors className="h-3 w-3" />
                        <span className="hidden sm:inline">Stems</span>
                      </TabsTrigger>
                    )}
                    {capabilities.instrumental && (
                      <TabsTrigger value="instrumental" className="flex items-center gap-1">
                        <Volume2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Instr.</span>
                      </TabsTrigger>
                    )}
                    {capabilities.vocals && (
                      <TabsTrigger value="vocals" className="flex items-center gap-1">
                        <Mic className="h-3 w-3" />
                        <span className="hidden sm:inline">Vocals</span>
                      </TabsTrigger>
                    )}
                    {capabilities.master && (
                      <TabsTrigger value="master" className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span className="hidden sm:inline">Master</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <TabsContent value={selectedMode} className="space-y-6 mt-6">
                  {/* File Upload with Drag & Drop */}
                  {['cover', 'extend', 'remix', 'stems'].includes(selectedMode) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Audio File
                      </Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="space-y-2">
                            <FileAudio className="h-8 w-8 mx-auto text-muted-foreground" />
                            <div className="text-sm">
                              {uploadedFile ? (
                                <div className="flex items-center justify-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="font-medium">{uploadedFile.name}</span>
                                </div>
                              ) : (
                                <>
                                  <span className="font-medium">Click to upload</span>
                                  <span className="text-muted-foreground"> or drag and drop</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">MP3, WAV, or FLAC up to 10MB</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Lyrics Input */}
                  {!naturalLanguageMode && selectedMode === 'generate' && !instrumental && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Lyrics (Optional)
                      </Label>
                      <Textarea
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        placeholder="Enter your lyrics here...\n\n[Verse 1]\nYour lyrics here\n\n[Chorus]\nYour chorus here"
                        className="min-h-[150px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use [Verse], [Chorus], [Bridge] tags to structure your lyrics
                      </p>
                    </div>
                  )}

                  {/* Model and Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Model Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Model
                      </Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedService === 'suno' && (
                            <>
                              <SelectItem value="auto">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-3 w-3" />
                                  Auto (Recommended)
                                </div>
                              </SelectItem>
                              <SelectItem value="V3">V3 - Classic (max 2 min)</SelectItem>
                              <SelectItem value="V3_5">V3.5 - Balanced (max 4 min)</SelectItem>
                              <SelectItem value="V4">V4 - High Quality (max 4 min)</SelectItem>
                              <SelectItem value="V4_5">V4.5 - Advanced (max 8 min)</SelectItem>
                              <SelectItem value="V4_5PLUS">
                                <div className="flex items-center gap-2">
                                  V4.5+ - Premium (max 8 min)
                                  <Badge variant="secondary" className="text-xs">Pro</Badge>
                                </div>
                              </SelectItem>
                            </>
                          )}
                          {selectedService === 'mureka' && (
                            <>
                              <SelectItem value="auto">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-3 w-3" />
                                  Auto (Latest)
                                </div>
                              </SelectItem>
                              <SelectItem value="V8">V8 - Latest</SelectItem>
                              <SelectItem value="V7">V7 - Stable</SelectItem>
                              <SelectItem value="O1">
                                <div className="flex items-center gap-2">
                                  O1 - Experimental
                                  <Badge variant="destructive" className="text-xs">Beta</Badge>
                                </div>
                              </SelectItem>
                              <SelectItem value="V6">V6 - Legacy</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration with Visual Indicator */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                      </Label>
                      <div className="space-y-2">
                        <Slider
                          value={[duration]}
                          onValueChange={([v]) => setDuration(v)}
                          min={10}
                          max={240}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10s</span>
                          <span>4min</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Settings */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Quick Settings</Label>
                      <div className="space-y-3">
                        {selectedMode === 'generate' && (
                          <div className="flex items-center justify-between">
                            <Label htmlFor="instrumental" className="text-sm cursor-pointer">
                              Instrumental Only
                            </Label>
                            <Switch
                              id="instrumental"
                              checked={instrumental}
                              onCheckedChange={setInstrumental}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Generate Button - Hero Style */}
        <Card className="bg-gradient-to-r from-primary/10 to-blue-600/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Main Generate Button */}
              <Button
                ref={generateButtonRef}
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-200 transform hover:scale-[1.02]"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                    Generating Your Music...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-3" />
                    Create {selectedMode === 'generate' ? 'Music' : selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}
                  </>
                )}
              </Button>
              
              {/* Secondary Actions */}
              <div className="flex gap-2 justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Available after generation
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled>
                      <FileAudio className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Available after generation
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Helpful Tips */}
              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  {userExperience === 'beginner' && "💡 Tip: Start with simple descriptions like 'upbeat pop song' or 'relaxing piano music'"}
                  {userExperience === 'intermediate' && "💡 Tip: Include genre, mood, and instruments for better results"}
                  {userExperience === 'advanced' && "💡 Tip: Use specific musical terms, BPM, and key signatures for precise control"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Service Status with Real-time Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Service Status & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Suno
                  </Badge>
                </div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Online</p>
                <p className="text-xs text-muted-foreground">~30s avg</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Mureka
                  </Badge>
                </div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Online</p>
                <p className="text-xs text-muted-foreground">~45s avg</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <Badge variant="secondary">Sonauto</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
                <p className="text-xs text-muted-foreground">Q2 2025</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <Badge variant="secondary">Udio</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
                <p className="text-xs text-muted-foreground">Q2 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Quick Help */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <HelpCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Need Help?</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {userExperience === 'beginner' && "New to AI music? Start with simple descriptions like 'happy pop song' or 'calm piano music'. The AI will handle the rest!"}
                  {userExperience === 'intermediate' && "Include mood, genre, and key instruments in your description. Try 'energetic rock song with electric guitar and drums'."}
                  {userExperience === 'advanced' && "Use advanced parameters like BPM, key signatures, and specific production techniques for professional results."}
                </p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="text-xs">
                    View Examples
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Documentation
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
});