// Feature barrel exports
export * from './artists';
export * from './projects';
export * from './lyrics';
export * from './ai-generation';

// Export tracks separately to avoid naming conflicts
export {
  CreateTrackDialog,
  TrackDetailsDialog,
  TrackDetailsView,
  TrackEditDialog,
  TrackGenerationDialog,
  TrackVersionsDialog,
  TrackViewDialog,
  TagPalette,
  LyricsAnalysisReport
} from './tracks';