import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  lyrics: string;
  stylePrompt?: string;
  genreTags?: string[];
  provider?: string;
  model?: string;
  temperature?: number;
}

interface ExpertAnalysis {
  expert: string;
  role: string;
  overall_score: number;
  criteria: {
    name: string;
    score: number;
    weight: number;
    feedback: string;
  }[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

interface AnalysisResult {
  overall_score: number;
  expert_analyses: ExpertAnalysis[];
  summary: {
    strengths: string[];
    priority_improvements: string[];
    quick_fixes: string[];
  };
  improvement_suggestions: {
    specific_lines: { line: string; suggestion: string; }[];
    structural_changes: string[];
    style_adjustments: string[];
  };
}

serve(async (req) => {
  console.log('Analyze lyrics function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();
    console.log('Analyzing lyrics with params:', { 
      lyricsLength: body.lyrics?.length,
      provider: body.provider,
      model: body.model 
    });

    if (!body.lyrics) {
      throw new Error('Lyrics are required for analysis');
    }

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const analysisPrompt = `
Ты - команда из 5 экспертов, анализирующих лирику музыкального трека с разных профессиональных точек зрения. 

ЛИРИКА ДЛЯ АНАЛИЗА:
${body.lyrics}

КОНТЕКСТ:
- Стиль: ${body.stylePrompt || 'Не указан'}
- Жанры: ${body.genreTags?.join(', ') || 'Не указаны'}

Проведи детальный анализ от лица каждого эксперта и верни результат в JSON формате:

{
  "overall_score": число_от_1_до_10,
  "expert_analyses": [
    {
      "expert": "Литературовед",
      "role": "Анализ литературных качеств и поэтических приемов",
      "overall_score": число_от_1_до_10,
      "criteria": [
        {
          "name": "Образность и метафоричность",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Глубина смысла",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Оригинальность идей",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        }
      ],
      "recommendations": ["конкретная_рекомендация_1", "рекомендация_2"],
      "strengths": ["сильная_сторона_1", "сильная_сторона_2"],
      "weaknesses": ["слабость_1", "слабость_2"]
    },
    {
      "expert": "Рифмовик",
      "role": "Анализ рифмовых схем и качества рифм",
      "overall_score": число_от_1_до_10,
      "criteria": [
        {
          "name": "Качество рифм",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Разнообразие рифмовых схем",
          "score": число_от_1_до_10,
          "weight": 8,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Избегание банальных рифм",
          "score": число_от_1_до_10,
          "weight": 7,
          "feedback": "детальная_оценка"
        }
      ],
      "recommendations": ["рекомендация_1", "рекомендация_2"],
      "strengths": ["сильная_сторона_1"],
      "weaknesses": ["слабость_1"]
    },
    {
      "expert": "Ритмист",
      "role": "Анализ ритмической структуры и музыкального размера",
      "overall_score": число_от_1_до_10,
      "criteria": [
        {
          "name": "Соответствие музыкальному размеру",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Естественность ударений",
          "score": число_от_1_до_10,
          "weight": 10,
          "feedback": "детальная_оценка"
        }
      ],
      "recommendations": ["рекомендация_1", "рекомендация_2"],
      "strengths": ["сильная_сторона_1"],
      "weaknesses": ["слабость_1"]
    },
    {
      "expert": "Продюсер",
      "role": "Оценка коммерческого потенциала и радиоформатности",
      "overall_score": число_от_1_до_10,
      "criteria": [
        {
          "name": "Коммерческий потенциал",
          "score": число_от_1_до_10,
          "weight": 8,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Запоминаемость хуков",
          "score": число_от_1_до_10,
          "weight": 7,
          "feedback": "детальная_оценка"
        }
      ],
      "recommendations": ["рекомендация_1", "рекомендация_2"],
      "strengths": ["сильная_сторона_1"],
      "weaknesses": ["слабость_1"]
    },
    {
      "expert": "Стилист",
      "role": "Анализ соответствия жанру и стилю исполнителя",
      "overall_score": число_от_1_до_10,
      "criteria": [
        {
          "name": "Соответствие жанру",
          "score": число_от_1_до_10,
          "weight": 5,
          "feedback": "детальная_оценка"
        },
        {
          "name": "Аутентичность стиля",
          "score": число_от_1_до_10,
          "weight": 5,
          "feedback": "детальная_оценка"
        }
      ],
      "recommendations": ["рекомендация_1", "рекомендация_2"],
      "strengths": ["сильная_сторона_1"],
      "weaknesses": ["слабость_1"]
    }
  ],
  "summary": {
    "strengths": ["общая_сильная_сторона_1", "сторона_2"],
    "priority_improvements": ["приоритетное_улучшение_1", "улучшение_2"],
    "quick_fixes": ["быстрое_исправление_1", "исправление_2"]
  },
  "improvement_suggestions": {
    "specific_lines": [
      {
        "line": "конкретная_строка_из_лирики",
        "suggestion": "как_её_улучшить"
      }
    ],
    "structural_changes": ["структурное_изменение_1", "изменение_2"],
    "style_adjustments": ["стилистическая_корректировка_1", "корректировка_2"]
  }
}

ВАЖНО: 
- Общий балл рассчитывается как взвешенное среднее всех экспертных оценок
- Веса экспертов: Литературовед 30%, Рифмовик 25%, Ритмист 20%, Продюсер 15%, Стилист 10%
- Давай конкретные, применимые рекомендации
- Указывай конкретные строки, которые можно улучшить
- Оценки должны быть обоснованными и детальными
`;

    console.log('Making API request to:', 'https://api.openai.com/v1/chat/completions');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Ты команда экспертов по анализу музыкальной лирики. Отвечай только в JSON формате.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: body.temperature || 0.7,
        max_tokens: 4000
      }),
    });

    console.log('API Response received');

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    let analysisResult: AnalysisResult;
    try {
      analysisResult = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse analysis result:', data.choices[0].message.content);
      throw new Error('Failed to parse analysis result from AI');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-lyrics function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});