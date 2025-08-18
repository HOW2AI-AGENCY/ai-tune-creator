import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Activity,
  FileText,
  TrendingUp,
  AlertTriangle,
  Settings,
  Database,
  Zap
} from 'lucide-react';

interface AuditMetric {
  name: string;
  status: 'good' | 'warning' | 'critical';
  value: string | number;
  description: string;
  recommendation?: string;
}

interface ProviderAudit {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  credits: string;
  strengths: string[];
  issues: string[];
  criticalProblems: string[];
}

export const AIGenerationAudit: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const providerAudits: ProviderAudit[] = [
    {
      name: 'Suno AI',
      status: 'online',
      credits: '87.2 кредитов',
      strengths: [
        'Комплексная система валидации',
        'Продвинутый rate limiting с cleanup',
        'Нормализация моделей (chirp-v3-5 → V3_5)',
        'Comprehensive retry логика',
        'Timeout handling для всех операций'
      ],
      issues: [
        'Сложная логика prepareSunoParams',
        'Недостаточное логирование в critical path',
        'Отсутствие distributed tracing'
      ],
      criticalProblems: []
    },
    {
      name: 'Mureka AI',
      status: 'degraded',
      credits: '$28.22 из $30.00',
      strengths: [
        'Гибкая обработка контента (prompt/lyrics)',
        'Comprehensive validation параметров',
        'Type-safe interfaces для API',
        'Хорошая документация в коде'
      ],
      issues: [
        'Inconsistent content processing',
        'Недостаточное логирование',
        'Слишком много логики в одной функции'
      ],
      criticalProblems: [
        'UUID валидация блокирует сохранение записей',
        'Неконсистентная обработка полей',
        'Отсутствие unified error handling'
      ]
    }
  ];

  const systemMetrics: AuditMetric[] = [
    {
      name: 'Edge Functions',
      status: 'good',
      value: '37 функций',
      description: 'Все критические функции работают',
      recommendation: 'Добавить мониторинг производительности'
    },
    {
      name: 'Database Integrity',
      status: 'warning',
      value: '1 критическая ошибка',
      description: 'UUID валидация в Mureka генерации',
      recommendation: 'НЕМЕДЛЕННО исправить extractUserId функцию'
    },
    {
      name: 'Rate Limiting',
      status: 'good',
      value: 'Настроено корректно',
      description: 'Suno: 5 req/10min, Mureka: 10 req/10min',
      recommendation: 'Добавить метрики использования'
    },
    {
      name: 'Error Handling',
      status: 'warning',
      value: 'Неконсистентно',
      description: 'Разные подходы в разных функциях',
      recommendation: 'Стандартизировать error responses'
    },
    {
      name: 'Logging Quality',
      status: 'critical',
      value: 'Недостаточно',
      description: 'Отсутствуют логи в critical paths',
      recommendation: 'Добавить structured logging'
    },
    {
      name: 'API Health',
      status: 'good',
      value: '100% uptime',
      description: 'Оба провайдера онлайн',
      recommendation: 'Добавить SLA мониторинг'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
      case 'online':
        return 'bg-green-500';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const overallScore = () => {
    const goodCount = systemMetrics.filter(m => m.status === 'good').length;
    const totalCount = systemMetrics.length;
    return Math.round((goodCount / totalCount) * 100);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            AI Generation System Audit
          </h1>
          <p className="text-muted-foreground">
            Полный аудит системы генерации, мониторинга и загрузки музыкальных треков
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{overallScore()}%</div>
          <div className="text-sm text-muted-foreground">Общая оценка</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="providers">Провайдеры</TabsTrigger>
          <TabsTrigger value="metrics">Метрики</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Работающие компоненты</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">4</div>
                <p className="text-xs text-muted-foreground">API статус, Rate limiting, CORS, Edge Functions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Предупреждения</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">2</div>
                <p className="text-xs text-muted-foreground">Database integrity, Error handling</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Критические проблемы</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">1</div>
                <p className="text-xs text-muted-foreground">UUID валидация в Mureka</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Критическая проблема:</strong> UUID валидация в generate-mureka-track функции блокирует 
              сохранение записей в базу данных. Функция extractUserId может возвращать строку "undefined" 
              вместо null, что вызывает ошибку PostgreSQL.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providerAudits.map((provider) => (
              <Card key={provider.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {provider.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.status)}
                      <Badge variant={provider.status === 'online' ? 'default' : 'destructive'}>
                        {provider.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{provider.credits}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {provider.criticalProblems.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Критические проблемы:</h4>
                      <ul className="text-sm space-y-1">
                        {provider.criticalProblems.map((problem, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                            {problem}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {provider.issues.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2">Проблемы:</h4>
                      <ul className="text-sm space-y-1">
                        {provider.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Сильные стороны:</h4>
                    <ul className="text-sm space-y-1">
                      {provider.strengths.slice(0, 3).map((strength, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          {providerAudits.map((provider) => (
            <Card key={provider.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {provider.name} - Детальный анализ
                </CardTitle>
                <CardDescription>
                  Статус: {provider.status} | Кредиты: {provider.credits}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="strengths">
                  <TabsList>
                    <TabsTrigger value="strengths">Сильные стороны</TabsTrigger>
                    <TabsTrigger value="issues">Проблемы</TabsTrigger>
                    {provider.criticalProblems.length > 0 && (
                      <TabsTrigger value="critical">Критические</TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="strengths" className="mt-4">
                    <div className="space-y-2">
                      {provider.strengths.map((strength, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="issues" className="mt-4">
                    <div className="space-y-2">
                      {provider.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <span className="text-sm">{issue}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  {provider.criticalProblems.length > 0 && (
                    <TabsContent value="critical" className="mt-4">
                      <div className="space-y-2">
                        {provider.criticalProblems.map((problem, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                            <span className="text-sm">{problem}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6">
            {systemMetrics.map((metric) => (
              <Card key={metric.name}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(metric.status)}
                      <div>
                        <h3 className="font-semibold">{metric.name}</h3>
                        <p className="text-sm text-muted-foreground">{metric.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{metric.value}</div>
                      <Badge variant={metric.status === 'good' ? 'default' : 
                                   metric.status === 'warning' ? 'secondary' : 'destructive'}>
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                  {metric.recommendation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Рекомендация:</strong> {metric.recommendation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Фаза 1: Критические исправления (до 2 дней)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Fix UUID validation в Mureka генерации</h4>
                    <p className="text-sm text-muted-foreground">
                      Исправить функцию extractUserId для возврата null вместо строки "undefined"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Добавить comprehensive logging</h4>
                    <p className="text-sm text-muted-foreground">
                      Структурированные логи во всех Edge Functions для отладки
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Унифицировать error responses</h4>
                    <p className="text-sm text-muted-foreground">
                      Стандартизировать формат ошибок для всех провайдеров
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Settings className="h-5 w-5" />
                  Фаза 2: Важные улучшения (до 1 недели)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Создать shared utilities</h4>
                    <p className="text-sm text-muted-foreground">
                      Общие функции для нормализации input данных
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Добавить metrics collection</h4>
                    <p className="text-sm text-muted-foreground">
                      Сбор метрик производительности и ошибок
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Улучшить validation API responses</h4>
                    <p className="text-sm text-muted-foreground">
                      Проверка корректности ответов от внешних API
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                  Фаза 3: Оптимизации (до 2 недель)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Refactor больших функций</h4>
                    <p className="text-sm text-muted-foreground">
                      Разделение функций больше 1000 строк на модули
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Добавить distributed tracing</h4>
                    <p className="text-sm text-muted-foreground">
                      Отслеживание запросов через всю систему
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Создать monitoring dashboard</h4>
                    <p className="text-sm text-muted-foreground">
                      Визуализация метрик и здоровья системы
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Документация:</strong> Полный отчет аудита сохранен в 
              docs/ai-generation-audit-report.md с техническими деталями и примерами кода.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
};