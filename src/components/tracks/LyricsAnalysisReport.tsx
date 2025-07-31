import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, XCircle, Lightbulb, Target, Zap } from 'lucide-react';

interface ExpertCriteria {
  name: string;
  score: number;
  weight: number;
  feedback: string;
}

interface ExpertAnalysis {
  expert: string;
  role: string;
  overall_score: number;
  criteria: ExpertCriteria[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

interface AnalysisData {
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

interface LyricsAnalysisReportProps {
  analysis: AnalysisData;
  onImproveClick?: () => void;
}

export function LyricsAnalysisReport({ analysis, onImproveClick }: LyricsAnalysisReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (score >= 6) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getProgressColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Общий балл */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getScoreIcon(analysis.overall_score)}
            Общая оценка лирики
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">
              <span className={getScoreColor(analysis.overall_score)}>
                {analysis.overall_score.toFixed(1)}
              </span>
              <span className="text-muted-foreground">/10</span>
            </div>
            <div className="flex-1">
              <Progress 
                value={analysis.overall_score * 10} 
                className="h-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Краткое резюме */}
      <Card>
        <CardHeader>
          <CardTitle>Краткое резюме</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.summary.strengths.length > 0 && (
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Сильные стороны
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {analysis.summary.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.summary.priority_improvements.length > 0 && (
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-600" />
                Приоритетные улучшения
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {analysis.summary.priority_improvements.map((improvement, index) => (
                  <li key={index}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.summary.quick_fixes.length > 0 && (
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Быстрые исправления
              </h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {analysis.summary.quick_fixes.map((fix, index) => (
                  <li key={index}>{fix}</li>
                ))}
              </ul>
            </div>
          )}

          {onImproveClick && (
            <Button onClick={onImproveClick} className="w-full mt-4">
              <Lightbulb className="w-4 h-4 mr-2" />
              Улучшить лирику на основе анализа
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Экспертные анализы */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Экспертные оценки</h3>
        {analysis.expert_analyses.map((expert, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span>{expert.expert}</span>
                  <p className="text-sm text-muted-foreground font-normal">{expert.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getScoreIcon(expert.overall_score)}
                  <span className={`text-lg font-bold ${getScoreColor(expert.overall_score)}`}>
                    {expert.overall_score.toFixed(1)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Критерии оценки */}
              <div>
                <h5 className="font-medium mb-3">Критерии оценки</h5>
                <div className="space-y-3">
                  {expert.criteria.map((criteria, criteriaIndex) => (
                    <div key={criteriaIndex} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{criteria.name}</span>
                        <Badge variant="outline" className={getScoreColor(criteria.score)}>
                          {criteria.score}/10 (вес: {criteria.weight}%)
                        </Badge>
                      </div>
                      <Progress 
                        value={criteria.score * 10} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">{criteria.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Сильные стороны */}
              {expert.strengths.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-600 mb-2">Сильные стороны</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {expert.strengths.map((strength, strengthIndex) => (
                      <li key={strengthIndex}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Слабые стороны */}
              {expert.weaknesses.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-600 mb-2">Области для улучшения</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {expert.weaknesses.map((weakness, weaknessIndex) => (
                      <li key={weaknessIndex}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Рекомендации */}
              {expert.recommendations.length > 0 && (
                <div>
                  <h5 className="font-medium text-blue-600 mb-2">Рекомендации</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {expert.recommendations.map((recommendation, recIndex) => (
                      <li key={recIndex}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Детальные предложения по улучшению */}
      <Card>
        <CardHeader>
          <CardTitle>Детальные предложения по улучшению</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Конкретные строки */}
          {analysis.improvement_suggestions.specific_lines.length > 0 && (
            <div>
              <h5 className="font-medium mb-3">Конкретные строки для доработки</h5>
              <div className="space-y-3">
                {analysis.improvement_suggestions.specific_lines.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">"{suggestion.line}"</p>
                    <p className="text-xs text-muted-foreground">💡 {suggestion.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Структурные изменения */}
          {analysis.improvement_suggestions.structural_changes.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Структурные изменения</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                {analysis.improvement_suggestions.structural_changes.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Стилистические корректировки */}
          {analysis.improvement_suggestions.style_adjustments.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Стилистические корректировки</h5>
              <ul className="list-disc list-inside text-sm space-y-1">
                {analysis.improvement_suggestions.style_adjustments.map((adjustment, index) => (
                  <li key={index}>{adjustment}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}