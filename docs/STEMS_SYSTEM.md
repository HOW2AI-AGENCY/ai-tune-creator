# Track Stems System

## Overview
System for managing separated audio stems for tracks, with support for simple (2 stems) and detailed (up to 12 stems) separation modes.

## Database Schema

### Tables

#### `track_stems`
Stores individual stem files with metadata:
- `id` (uuid, PK)
- `track_id` (uuid, FK to tracks)
- `variant_number` (integer) - links stem to specific track variant
- `separation_mode` ('simple' | 'detailed')
- `stem_type` (text) - type of stem (vocals, drums, etc.)
- `stem_name` (text) - display name
- `stem_url` (text) - audio file URL
- `file_size` (bigint) - size in bytes
- `duration` (integer) - duration in seconds
- `waveform_data` (jsonb) - optional waveform visualization data
- `metadata` (jsonb) - additional metadata
- `created_at`, `updated_at` (timestamptz)

#### `tracks` (extended fields)
- `has_stems` (boolean) - flag indicating if track has stems
- `stems_count` (integer) - number of stems available
- `stems_separation_mode` ('simple' | 'detailed') - mode used for separation

### RLS Policies
- Users can view stems for their own tracks (through project -> artist -> user relationship)
- Users can manage (insert/update/delete) stems for their own tracks

### Automatic Updates
Trigger `trigger_update_stems_count` automatically updates `has_stems` and `stems_count` fields when stems are added or removed.

## Components

### `TrackRowWithStems`
Main component for displaying tracks with expandable stems list.

**Props:**
```typescript
interface TrackRowWithStemsProps {
  track: Track;
  isPlaying?: boolean;
  onPlay?: (track: Track) => void;
  onSelect?: (track: Track) => void;
  className?: string;
}
```

**Features:**
- ✅ Expandable stems list with smooth animation
- ✅ Badge showing number of stems
- ✅ Individual stem playback
- ✅ Individual stem download
- ✅ Visual indicators for playing state
- ✅ Master variant badge

### `useTrackStems`
React hook for managing stem data.

**API:**
```typescript
const {
  stems,           // Array of Stem objects
  isLoading,       // Loading state
  cachedStems,     // Cached stem information
  loadStems,       // Reload stems
  checkExistingStems, // Check if stems exist
  downloadStem,    // Download single stem
  downloadAllStems // Download all stems as batch
} = useTrackStems(trackId, variantNumber);
```

## Types

### Stem Types
```typescript
type StemType = 
  | 'vocals' | 'backingVocals' | 'instrumental'
  | 'drums' | 'bass' | 'guitar' | 'keyboard'
  | 'strings' | 'brass' | 'woodwinds' | 'percussion'
  | 'synth' | 'fx';
```

### Separation Modes
- **simple**: 2 stems (vocals + instrumental)
- **detailed**: Up to 12 stems (individual instruments)

## Features

### ✅ Implemented
- Expandable stems list UI
- Individual stem playback
- Individual stem download
- Batch stem download
- Cached stems detection
- Automatic stem count updates
- RLS security policies

### 🔄 Week 2 Roadmap
- Track variants system
- Variant selector component
- Master variant management
- Stem separation dialog improvements
- Enhanced stem visualization

## Usage Example

```tsx
import { TrackRowWithStems } from '@/components/tracks/TrackRowWithStems';

function MyComponent() {
  const handlePlay = (track) => {
    // Play track or stem
  };
  
  return (
    <TrackRowWithStems
      track={track}
      isPlaying={currentTrackId === track.id}
      onPlay={handlePlay}
      onSelect={handleTrackSelect}
    />
  );
}
```

## Security Considerations

1. **RLS Policies**: All stem access is protected by Row-Level Security
2. **User Ownership**: Users can only access stems for tracks they own
3. **Signed URLs**: Consider implementing signed URLs for stem downloads
4. **File Size Limits**: Enforce reasonable file size limits on upload

## Performance Notes

1. **Lazy Loading**: Stems are only loaded when expanded
2. **Batch Operations**: Download all stems includes small delays to avoid overwhelming the client
3. **Caching**: Stem metadata is cached in component state
4. **Indexes**: Database indexes on `track_id` and `variant_number` for fast queries

## Migration Applied

Migration successfully created:
- `track_stems` table
- `track_relations` table (for Week 2)
- `filter_presets` table (for Week 3)
- Automatic trigger for stem count updates
- All necessary indexes and RLS policies

*Last Updated: 2025-10-02*
