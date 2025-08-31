import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface TelegramGenerationFormProps {
  onGenerate: (prompt: string) => void;
  isLoading?: boolean;
}

export const TelegramGenerationForm = ({ onGenerate, isLoading = false }: TelegramGenerationFormProps) => {
  const [prompt, setPrompt] = useState('');

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите музыку, которую хотите создать..."
          className="min-h-[100px]"
        />
        <Button 
          onClick={() => onGenerate(prompt)}
          disabled={!prompt.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? 'Генерирую...' : 'Создать музыку'}
        </Button>
      </CardContent>
    </Card>
  );
};