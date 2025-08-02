/**
 * Utilities for working with song lyrics
 */

export interface LyricsSection {
  type: string;
  label: string;
  content: string;
  startLine: number;
  endLine: number;
}

export interface LyricsMetrics {
  wordCount: number;
  lineCount: number;
  sectionCount: number;
  estimatedDuration: string;
  syllableCount: number;
}

// Common song structure tags
export const SONG_STRUCTURE_TAGS = [
  '[Verse]',
  '[Verse 1]',
  '[Verse 2]',
  '[Verse 3]',
  '[Chorus]',
  '[Pre-Chorus]',
  '[Bridge]',
  '[Outro]',
  '[Intro]',
  '[Hook]',
  '[Refrain]',
  '[Tag]',
  '[Coda]',
];

/**
 * Parse lyrics into structured sections
 */
export function parseLyrics(lyrics: string): LyricsSection[] {
  const lines = lyrics.split('\n');
  const sections: LyricsSection[] = [];
  let currentSection: LyricsSection | null = null;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check if line is a structure tag
    const isStructureTag = /^\[([^\]]+)\]$/.test(trimmedLine);
    
    if (isStructureTag) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.endLine = index - 1;
        sections.push(currentSection);
      }
      
      // Start new section
      currentSection = {
        type: trimmedLine.slice(1, -1).toLowerCase(),
        label: trimmedLine,
        content: '',
        startLine: index,
        endLine: index,
      };
    } else if (currentSection) {
      // Add content to current section
      currentSection.content += (currentSection.content ? '\n' : '') + line;
      currentSection.endLine = index;
    } else if (trimmedLine) {
      // Create unnamed section for content without structure tags
      currentSection = {
        type: 'verse',
        label: 'Verse',
        content: line,
        startLine: index,
        endLine: index,
      };
    }
  });
  
  // Add last section if exists
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Calculate lyrics metrics
 */
export function calculateLyricsMetrics(lyrics: string): LyricsMetrics {
  const lines = lyrics.split('\n').filter(line => line.trim());
  const words = lyrics.split(/\s+/).filter(word => word.trim() && !word.match(/^\[.*\]$/));
  const sections = parseLyrics(lyrics);
  
  // Simple syllable counting (approximation)
  const syllableCount = words.reduce((count, word) => {
    return count + countSyllables(word.replace(/[^\w]/g, ''));
  }, 0);
  
  // Estimate duration (roughly 2-3 words per second for singing)
  const estimatedSeconds = Math.round(words.length / 2.5);
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = estimatedSeconds % 60;
  const estimatedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return {
    wordCount: words.length,
    lineCount: lines.length,
    sectionCount: sections.length,
    estimatedDuration,
    syllableCount,
  };
}

/**
 * Simple syllable counting function
 */
function countSyllables(word: string): number {
  if (!word) return 0;
  word = word.toLowerCase();
  
  // Remove silent e
  if (word.endsWith('e')) {
    word = word.slice(0, -1);
  }
  
  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  return vowelGroups ? vowelGroups.length : 1;
}

/**
 * Highlight song structure in text
 */
export function highlightStructure(text: string): string {
  return text.replace(/(\[([^\]]+)\])/g, '<span class="lyrics-structure-tag">$1</span>');
}

/**
 * Find rhymes in lyrics (simple implementation)
 */
export function findRhymes(lyrics: string): { [key: string]: string[] } {
  const words = lyrics
    .split(/\s+/)
    .filter(word => word.trim() && !word.match(/^\[.*\]$/))
    .map(word => word.replace(/[^\w]/g, '').toLowerCase())
    .filter(word => word.length > 2);
    
  const rhymes: { [key: string]: string[] } = {};
  
  words.forEach((word, index) => {
    const ending = word.slice(-2); // Simple 2-letter ending matching
    if (!rhymes[ending]) {
      rhymes[ending] = [];
    }
    if (!rhymes[ending].includes(word)) {
      rhymes[ending].push(word);
    }
  });
  
  // Filter out endings with only one word
  Object.keys(rhymes).forEach(ending => {
    if (rhymes[ending].length < 2) {
      delete rhymes[ending];
    }
  });
  
  return rhymes;
}

/**
 * Auto-complete structure tags
 */
export function autoCompleteStructureTag(input: string): string[] {
  const lowerInput = input.toLowerCase();
  return SONG_STRUCTURE_TAGS.filter(tag => 
    tag.toLowerCase().includes(lowerInput)
  );
}

/**
 * Format lyrics for export
 */
export function formatLyricsForExport(lyrics: string, format: 'plain' | 'markdown' | 'html'): string {
  const sections = parseLyrics(lyrics);
  
  switch (format) {
    case 'markdown':
      return sections.map(section => 
        `## ${section.label}\n\n${section.content}\n`
      ).join('\n');
      
    case 'html':
      return sections.map(section => 
        `<h2>${section.label}</h2>\n<p>${section.content.replace(/\n/g, '<br>')}</p>`
      ).join('\n\n');
      
    default:
      return lyrics;
  }
}