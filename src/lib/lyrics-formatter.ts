/**
 * Utility functions for formatting lyrics in readable format
 * T-059: Format lyrics consistently across all components
 */

export function formatLyricsReadable(lyricsData: any): string {
  if (!lyricsData) return '';

  // If it's already a plain string
  if (typeof lyricsData === 'string') {
    return cleanLyricsFormat(lyricsData);
  }

  // If it's an object with improved_text
  if (lyricsData.improved_text) {
    return cleanLyricsFormat(lyricsData.improved_text);
  }

  // If it's an object with improved_lyrics
  if (lyricsData.improved_lyrics) {
    return cleanLyricsFormat(lyricsData.improved_lyrics);
  }

  // If it's structured data with song.structure
  if (lyricsData.song?.structure) {
    return lyricsData.song.structure
      .map((part: any) => {
        const tag = part.tag ? `[${part.tag.replace(/[\[\]]/g, '').toUpperCase()}]` : '';
        const lyrics = part.lyrics || part.text || '';
        return tag ? `${tag}\n${lyrics}` : lyrics;
      })
      .join('\n\n');
  }

  // If it's an array of parts
  if (Array.isArray(lyricsData)) {
    return lyricsData
      .map((part: any) => {
        if (typeof part === 'string') return part;
        const tag = part.tag ? `[${part.tag.replace(/[\[\]]/g, '').toUpperCase()}]` : '';
        const lyrics = part.lyrics || part.text || part.content || '';
        return tag ? `${tag}\n${lyrics}` : lyrics;
      })
      .join('\n\n');
  }

  // If it has direct lyrics property
  if (lyricsData.lyrics) {
    return cleanLyricsFormat(lyricsData.lyrics);
  }

  // If it has text property
  if (lyricsData.text) {
    return cleanLyricsFormat(lyricsData.text);
  }

  // If it has content property
  if (lyricsData.content) {
    return cleanLyricsFormat(lyricsData.content);
  }

  // Fallback: try to extract readable text from object
  return extractReadableText(lyricsData);
}

function cleanLyricsFormat(text: string): string {
  if (!text) return '';

  return text
    // Convert tags to English and proper format
    .replace(/\[(Куплет|Verse|VERSE)(\s*\d*)?\]/gi, '[VERSE$2]')
    .replace(/\[(Припев|Chorus|CHORUS)\]/gi, '[CHORUS]')
    .replace(/\[(Бридж|Bridge|BRIDGE)\]/gi, '[BRIDGE]')
    .replace(/\[(Интро|Intro|INTRO)\]/gi, '[INTRO]')
    .replace(/\[(Аутро|Outro|OUTRO)\]/gi, '[OUTRO]')
    .replace(/\[(Пре-припев|Pre-Chorus|PRE-CHORUS)\]/gi, '[PRE-CHORUS]')
    .replace(/\[(Хук|Hook|HOOK)\]/gi, '[HOOK]')
    
    // Remove extra whitespace and ensure proper formatting
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    
    // Ensure 4-line stanzas (approximately)
    .split('\n\n')
    .map(section => {
      if (section.startsWith('[')) return section;
      const lines = section.split('\n').filter(line => line.trim());
      return formatStanza(lines);
    })
    .join('\n\n');
}

function formatStanza(lines: string[]): string {
  if (lines.length <= 4) return lines.join('\n');
  
  // Group into 4-line stanzas
  const stanzas = [];
  for (let i = 0; i < lines.length; i += 4) {
    stanzas.push(lines.slice(i, i + 4).join('\n'));
  }
  return stanzas.join('\n\n');
}

function extractReadableText(data: any): string {
  if (!data) return '';
  
  // If it's a JSON string, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return formatLyricsReadable(parsed);
    } catch {
      return cleanLyricsFormat(data);
    }
  }

  // Try to find text in common properties
  const possibleKeys = ['lyrics', 'text', 'content', 'song', 'improved_lyrics', 'improved_text'];
  
  for (const key of possibleKeys) {
    if (data[key]) {
      return formatLyricsReadable(data[key]);
    }
  }

  // Last resort: stringify with basic formatting
  return JSON.stringify(data, null, 2);
}

export function isValidLyricsFormat(lyrics: string): boolean {
  if (!lyrics || typeof lyrics !== 'string') return false;
  
  // Check if it has proper section tags
  const hasValidTags = /\[(VERSE|CHORUS|BRIDGE|INTRO|OUTRO|PRE-CHORUS|HOOK)(\s*\d*)?\]/i.test(lyrics);
  
  // Check if it's not just JSON
  const isNotJson = !lyrics.trim().startsWith('{') && !lyrics.trim().startsWith('[');
  
  return hasValidTags && isNotJson;
}