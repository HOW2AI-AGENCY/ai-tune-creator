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

/**
 * Parse lyrics structure for viewer component
 */
export function parseLyricsStructure(lyrics: string): {
  structure: { id: string; type: string; title?: string }[];
  sections: { id: string; type: string; title?: string; content: string }[];
} {
  const lines = lyrics.split('\n');
  const structure: { id: string; type: string; title?: string }[] = [];
  const sections: { id: string; type: string; title?: string; content: string }[] = [];
  
  let currentSection: { id: string; type: string; title?: string; content: string } | null = null;
  let sectionCounter = 0;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check if line is a structure tag
    const structureMatch = /^\[([^\]]+)\]$/.exec(trimmedLine);
    
    if (structureMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const fullTag = structureMatch[1];
      const type = parseStructureType(fullTag);
      const sectionId = `section-${sectionCounter++}`;
      
      // Add to structure navigation
      structure.push({
        id: sectionId,
        type,
        title: fullTag !== type ? fullTag : undefined
      });
      
      // Start new section
      currentSection = {
        id: sectionId,
        type,
        title: fullTag !== type ? fullTag : undefined,
        content: ''
      };
    } else if (currentSection) {
      // Add content to current section
      if (currentSection.content && trimmedLine) {
        currentSection.content += '\n' + line;
      } else if (trimmedLine) {
        currentSection.content = line;
      } else if (currentSection.content) {
        currentSection.content += '\n';
      }
    } else if (trimmedLine) {
      // Create unnamed section for content without structure tags
      const sectionId = `section-${sectionCounter++}`;
      currentSection = {
        id: sectionId,
        type: 'unknown',
        content: line
      };
    }
  });
  
  // Add last section if exists
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return { structure, sections };
}

/**
 * Parse structure type from tag
 */
function parseStructureType(tag: string): string {
  const lowerTag = tag.toLowerCase();
  
  if (lowerTag.includes('verse') || lowerTag.includes('куплет')) return 'verse';
  if (lowerTag.includes('chorus') || lowerTag.includes('припев')) return 'chorus';
  if (lowerTag.includes('bridge') || lowerTag.includes('бридж')) return 'bridge';
  if (lowerTag.includes('pre-chorus') || lowerTag.includes('пред-припев')) return 'pre-chorus';
  if (lowerTag.includes('outro') || lowerTag.includes('концовка') || lowerTag.includes('финал')) return 'outro';
  if (lowerTag.includes('intro') || lowerTag.includes('вступление')) return 'intro';
  if (lowerTag.includes('hook') || lowerTag.includes('хук')) return 'hook';
  if (lowerTag.includes('refrain') || lowerTag.includes('рефрен')) return 'refrain';
  
  return 'unknown';
}