import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateArtistInfoRequest {
  name: string;
  prompt?: string;
  context?: string;
}

interface GeneratedArtistInfo {
  description: string;
  genre: string;
  location: string;
  background: string;
  style: string;
  influences: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { name, prompt, context }: GenerateArtistInfoRequest = await req.json();

    if (!name) {
      throw new Error('Artist name is required');
    }

    const systemPrompt = `Ты помощник для создания профилей музыкальных артистов. Создай детальную информацию для артиста на основе его имени и дополнительного контекста.

Верни JSON объект с следующими полями:
- description: подробное описание артиста (2-3 предложения)
- genre: основной жанр музыки
- location: вероятная локация артиста
- background: краткая предыстория артиста
- style: описание музыкального стиля
- influences: массив влияний/вдохновений (3-5 элементов)

Отвечай только валидным JSON без дополнительного текста.`;

    const userPrompt = `Создай профиль для артиста "${name}".
${context ? `Дополнительный контекст: ${context}` : ''}
${prompt ? `Особые требования: ${prompt}` : ''}

Создай реалистичный и интересный профиль, который будет полезен для дальнейшего создания лирики и маркетинговых материалов.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    let artistInfo: GeneratedArtistInfo;
    try {
      artistInfo = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse generated content:', generatedContent);
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify({ artistInfo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-artist-info function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});