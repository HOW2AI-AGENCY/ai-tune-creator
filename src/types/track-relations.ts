/**
 * Track Relations Types
 */

export type TrackRelationType =
  | 'variant'
  | 'version'
  | 'cover'
  | 'remix'
  | 'prompt_variation'
  | 'lyrics_variation'
  | 'style_variation'
  | 'continuation'
  | 'inspiration';

export interface TrackRelation {
  id: string;
  source_track_id: string;
  target_track_id: string;
  relation_type: TrackRelationType;
  metadata: Record<string, any>;
  created_at: string;
  created_by: string;
}

export const RELATION_ICONS: Record<TrackRelationType, string> = {
  variant: '🔄',
  version: '📝',
  cover: '🎭',
  remix: '🎚️',
  prompt_variation: '💭',
  lyrics_variation: '📜',
  style_variation: '🎨',
  continuation: '➡️',
  inspiration: '💡'
};

export const RELATION_NAMES: Record<TrackRelationType, string> = {
  variant: 'Вариант',
  version: 'Версия',
  cover: 'Кавер',
  remix: 'Ремикс',
  prompt_variation: 'Изменение промпта',
  lyrics_variation: 'Изменение лирики',
  style_variation: 'Изменение стиля',
  continuation: 'Продолжение',
  inspiration: 'Источник вдохновения'
};

export const RELATION_COLORS: Record<TrackRelationType, string> = {
  variant: 'text-green-500',
  version: 'text-blue-500',
  cover: 'text-purple-500',
  remix: 'text-orange-500',
  prompt_variation: 'text-yellow-500',
  lyrics_variation: 'text-red-500',
  style_variation: 'text-brown-500',
  continuation: 'text-gray-900',
  inspiration: 'text-gray-500'
};
