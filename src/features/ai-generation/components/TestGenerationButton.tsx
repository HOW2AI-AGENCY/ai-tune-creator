import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  service: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function TestGenerationButton() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    const tests = [
      {
        service: 'Suno AI - Description Mode',
        testFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-suno-track', {
            body: {
              prompt: 'Энергичная электронная музыка с ритмичными битами',
              inputType: 'description',
              style: 'electronic, energetic, dance',
              model: 'V3_5',
              mode: 'quick',
              make_instrumental: false,
              useInbox: true
            }
          });
          
          if (error) throw new Error(error.message);
          if (!data.success) throw new Error(data.error);
          
          return data;
        }
      },
      {
        service: 'Suno AI - Lyrics Mode',  
        testFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-suno-track', {
            body: {
              prompt: '[Verse]\nThis is my test song\nWith simple lyrics\n[Chorus]\nTest, test, testing\nGeneration working',
              inputType: 'lyrics',
              stylePrompt: 'Pop, upbeat, modern',
              model: 'V3_5',
              mode: 'custom',
              make_instrumental: false,
              useInbox: true
            }
          });
          
          if (error) throw new Error(error.message);
          if (!data.success) throw new Error(data.error);
          
          return data;
        }
      },
      {
        service: 'Mureka AI - Description Mode',
        testFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-mureka-track', {
            body: {
              prompt: 'Создай современную электронную композицию с энергичным ритмом',
              inputType: 'description',
              model: 'V7',
              style: 'electronic, energetic',
              useInbox: true
            }
          });
          
          if (error) throw new Error(error.message);
          if (!data.success) throw new Error(data.error);
          
          return data;
        }
      },
      {
        service: 'Mureka AI - Lyrics Mode',
        testFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-mureka-track', {
            body: {
              custom_lyrics: '[Verse]\nЭто тестовая песня\nС простыми словами\n[Chorus]\nТест, тест, тестирую\nГенерация работает',
              inputType: 'lyrics',
              model: 'V7',
              style: 'pop, upbeat',
              useInbox: true
            }
          });
          
          if (error) throw new Error(error.message);
          if (!data.success) throw new Error(data.error);
          
          return data;
        }
      },
      {
        service: 'Style Boost',
        testFn: async () => {
          const { data, error } = await supabase.functions.invoke('boost-suno-style', {
            body: {
              content: 'энергичная рок музыка'
            }
          });
          
          if (error) throw new Error(error.message);
          
          return data;
        }
      }
    ];

    for (const test of tests) {
      try {
        setResults(prev => [...prev, {
          service: test.service,
          status: 'pending',
          message: 'Выполняется...'
        }]);
        
        const result = await test.testFn();
        
        setResults(prev => prev.map(r => 
          r.service === test.service 
            ? {
                service: test.service,
                status: 'success' as const,
                message: 'Успешно',
                details: result
              }
            : r
        ));
        
      } catch (error: any) {
        setResults(prev => prev.map(r => 
          r.service === test.service
            ? {
                service: test.service,
                status: 'error' as const,
                message: error.message,
                details: error
              }
            : r
        ));
      }
    }
    
    setTesting(false);
    
    const successes = results.filter(r => r.status === 'success').length;
    const total = tests.length;
    
    toast({
      title: "Тестирование завершено",
      description: `${successes}/${total} тестов прошли успешно`
    });
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={runTests}
        disabled={testing}
        className="w-full"
        variant="outline"
      >
        {testing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Тестирование...
          </>
        ) : (
          <>
            <TestTube className="mr-2 h-4 w-4" />
            Протестировать генерацию
          </>
        )}
      </Button>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Результаты тестов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm font-medium">{result.service}</span>
                <div className="flex items-center gap-2">
                  {result.status === 'pending' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {result.status === 'error' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant={
                    result.status === 'success' ? 'default' :
                    result.status === 'error' ? 'destructive' :
                    'secondary'
                  }>
                    {result.message}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}