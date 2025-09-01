import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

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
  onGenerate: (formData: GenerationFormData) => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

export const TelegramGenerationForm = ({ onGenerate, onCancel, isGenerating }: TelegramGenerationFormProps) => {
  const [formData, setFormData] = useState<GenerationFormData>({
    prompt: '',
    genre: 'pop',
    mood: 'upbeat',
    duration: 180,
    tempo: 120,
    instrumental: false,
    language: 'en',
    tags: []
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Textarea
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
          placeholder="Опишите музыку, которую хотите создать..."
          className="min-h-[100px]"
        />
        <Button 
          onClick={() => formData.prompt.trim() && onGenerate(formData)}
          disabled={!formData.prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? 'Генерирую...' : 'Создать музыку'}
        </Button>
      </CardContent>
    </Card>
  );
};