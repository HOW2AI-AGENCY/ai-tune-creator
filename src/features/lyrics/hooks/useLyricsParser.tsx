import { useState, useEffect, useMemo } from 'react';
import { parseLyrics, calculateLyricsMetrics, findRhymes, type LyricsSection, type LyricsMetrics } from '../utils/lyricsUtils';

interface UseLyricsParserReturn {
  sections: LyricsSection[];
  metrics: LyricsMetrics;
  rhymes: { [key: string]: string[] };
  currentSection: LyricsSection | null;
  navigateToSection: (sectionIndex: number) => void;
  highlightedLines: number[];
}

export function useLyricsParser(lyrics: string, currentLine?: number): UseLyricsParserReturn {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // Parse lyrics into sections
  const sections = useMemo(() => parseLyrics(lyrics), [lyrics]);
  
  // Calculate metrics
  const metrics = useMemo(() => calculateLyricsMetrics(lyrics), [lyrics]);
  
  // Find rhymes
  const rhymes = useMemo(() => findRhymes(lyrics), [lyrics]);
  
  // Current section based on cursor position or manual selection
  const currentSection = useMemo(() => {
    if (currentLine !== undefined) {
      const section = sections.find(s => 
        currentLine >= s.startLine && currentLine <= s.endLine
      );
      return section || sections[currentSectionIndex] || null;
    }
    return sections[currentSectionIndex] || null;
  }, [sections, currentLine, currentSectionIndex]);
  
  // Highlighted lines for current section
  const highlightedLines = useMemo(() => {
    if (!currentSection) return [];
    const lines = [];
    for (let i = currentSection.startLine; i <= currentSection.endLine; i++) {
      lines.push(i);
    }
    return lines;
  }, [currentSection]);
  
  const navigateToSection = (sectionIndex: number) => {
    if (sectionIndex >= 0 && sectionIndex < sections.length) {
      setCurrentSectionIndex(sectionIndex);
    }
  };
  
  // Auto-update current section when lyrics change
  useEffect(() => {
    if (currentSectionIndex >= sections.length) {
      setCurrentSectionIndex(Math.max(0, sections.length - 1));
    }
  }, [sections.length, currentSectionIndex]);
  
  return {
    sections,
    metrics,
    rhymes,
    currentSection,
    navigateToSection,
    highlightedLines,
  };
}