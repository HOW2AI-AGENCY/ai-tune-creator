import * as React from "react";
import { Button } from "@/components/ui/button";
import { 
  Grid3X3, 
  List, 
  Calendar,
  BarChart3,
  Waves
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewMode = 'grid' | 'list' | 'timeline' | 'analytics' | 'waveform';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  availableModes?: ViewMode[];
  className?: string;
}

const VIEW_MODE_CONFIG = {
  grid: {
    icon: Grid3X3,
    label: 'Grid View',
    description: 'Card-based grid layout'
  },
  list: {
    icon: List,
    label: 'List View',
    description: 'Detailed list with metadata'
  },
  timeline: {
    icon: Calendar,
    label: 'Timeline View',
    description: 'Chronological timeline'
  },
  analytics: {
    icon: BarChart3,
    label: 'Analytics View',
    description: 'Charts and statistics'
  },
  waveform: {
    icon: Waves,
    label: 'Waveform View',
    description: 'Audio waveform visualization'
  }
} as const;

export function ViewModeToggle({ 
  currentMode, 
  onModeChange, 
  availableModes = ['grid', 'list', 'timeline'],
  className 
}: ViewModeToggleProps) {
  return (
    <TooltipProvider>
      <div className={`flex rounded-lg border bg-background p-1 ${className}`}>
        {availableModes.map((mode) => {
          const config = VIEW_MODE_CONFIG[mode];
          const Icon = config.icon;
          const isActive = currentMode === mode;
          
          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onModeChange(mode)}
                  className={`h-8 w-8 p-0 transition-all ${
                    isActive 
                      ? 'shadow-sm' 
                      : 'hover:bg-muted hover:scale-105'
                  }`}
                  aria-label={config.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}