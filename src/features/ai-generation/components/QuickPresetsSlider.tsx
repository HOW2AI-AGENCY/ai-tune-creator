import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { QuickPreset } from "../types";

interface QuickPresetsSliderProps {
  presets: QuickPreset[];
  onSelectPreset: (preset: QuickPreset) => void;
  selectedPresetId?: string;
}

export function QuickPresetsSlider({
  presets,
  onSelectPreset,
  selectedPresetId
}: QuickPresetsSliderProps) {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {presets.map((preset) => (
          <CarouselItem key={preset.id} className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-1/3">
            <Card
              className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-2 rounded-xl ${
                selectedPresetId === preset.id 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSelectPreset(preset)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl flex-shrink-0">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight mb-1">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {preset.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {preset.genre}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-1">
                    {preset.mood}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={preset.service === 'suno' ? 'default' : 'outline'} 
                    className="text-xs px-2 py-1"
                  >
                    {preset.service}
                  </Badge>
                  {selectedPresetId === preset.id && (
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex -left-12 bg-background/80 backdrop-blur-sm border-border/50" />
      <CarouselNext className="hidden md:flex -right-12 bg-background/80 backdrop-blur-sm border-border/50" />
    </Carousel>
  );
}