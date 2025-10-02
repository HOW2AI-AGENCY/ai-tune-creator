/**
 * Active Generations Panel
 * Панель отображения активных генераций с этапами
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerationStageIndicator } from "./GenerationStageIndicator";
import { useGenerationMonitor } from "@/hooks/useGenerationMonitor";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ActiveGenerations() {
  const { activeStates, monitor } = useGenerationMonitor();

  if (activeStates.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Активные генерации ({activeStates.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activeStates.map((state) => (
              <div 
                key={state.id} 
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Заголовок */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{state.title}</h4>
                    {state.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {state.subtitle}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => {
                      // TODO: Implement cancel
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Общий прогресс */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Прогресс</span>
                    <span className="font-medium tabular-nums">{state.overallProgress}%</span>
                  </div>
                  <Progress value={state.overallProgress} className="h-1.5" />
                </div>

                {/* Этапы */}
                <GenerationStageIndicator 
                  stages={state.stages}
                  currentStage={state.currentStage}
                />

                {/* Действия */}
                {state.status === 'failed' && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-destructive">
                      Генерация завершилась с ошибкой
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        // TODO: Implement retry
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Повторить
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
