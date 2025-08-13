import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuickPreset } from "../types";

interface QuickPresetsGridProps {
  presets: QuickPreset[];
  onSelectPreset: (preset: QuickPreset) => void;
  selectedPresetId?: string;
}

export function QuickPresetsGrid({ 
  presets, 
  onSelectPreset, 
  selectedPresetId 
}: QuickPresetsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {presets.map((preset) => (
        <Card 
          key={preset.id}
          className={`cursor-pointer transition-all hover:scale-105 border-2 ${
            selectedPresetId === preset.id 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onSelectPreset(preset)}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-lg">{preset.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight">{preset.name}</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="secondary" className="text-xs">
                {preset.genre}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {preset.mood}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Badge 
                variant={preset.service === 'suno' ? 'default' : 'outline'} 
                className="text-xs"
              >
                {preset.service}
              </Badge>
              {selectedPresetId === preset.id && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}