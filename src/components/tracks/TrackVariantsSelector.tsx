import { useState } from 'react';
import { Star, ChevronDown, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface TrackVariant {
  id: string;
  title: string;
  audio_url?: string;
  variant_number: number;
  is_master_variant: boolean;
  duration?: number;
}

interface TrackVariantsSelectorProps {
  variants: TrackVariant[];
  currentVariantId: string;
  onVariantSelect: (variant: TrackVariant) => void;
  onSetMaster?: (variantId: string) => void;
  className?: string;
}

export function TrackVariantsSelector({
  variants,
  currentVariantId,
  onVariantSelect,
  onSetMaster,
  className
}: TrackVariantsSelectorProps) {
  const currentVariant = variants.find(v => v.id === currentVariantId);
  const masterVariant = variants.find(v => v.is_master_variant);

  if (variants.length <= 1) return null;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn('gap-2', className)}
        >
          <span className="text-xs text-muted-foreground">
            Вариант {currentVariant?.variant_number || 1}/{variants.length}
          </span>
          {currentVariant?.is_master_variant && (
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Выберите вариант ({variants.length})
        </div>
        {variants.map((variant) => (
          <DropdownMenuItem
            key={variant.id}
            onClick={() => onVariantSelect(variant)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs',
                variant.id === currentVariantId 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}>
                {variant.variant_number}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {variant.is_master_variant && (
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">
                    {variant.title}
                  </span>
                </div>
                {variant.duration && (
                  <div className="text-xs text-muted-foreground">
                    {formatDuration(variant.duration)}
                  </div>
                )}
              </div>

              {variant.id === currentVariantId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>

            {onSetMaster && !variant.is_master_variant && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetMaster(variant.id);
                }}
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
