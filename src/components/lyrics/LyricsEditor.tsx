import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { LyricsToolbar } from './LyricsToolbar';
import { LyricsStructurePanel } from './LyricsStructurePanel';
import { LyricsMetrics } from './LyricsMetrics';
import { LyricsExportDialog } from './LyricsExportDialog';
import { useLyricsParser } from '@/hooks/useLyricsParser';
import { useLyricsAutoSave } from '@/hooks/useLyricsAutoSave';
import { autoCompleteStructureTag } from '@/lib/lyricsUtils';
import { Search, X, Replace } from 'lucide-react';

interface LyricsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (lyrics: string) => Promise<void>;
  autoSave?: boolean;
  placeholder?: string;
  trackTitle?: string;
  className?: string;
  showSidebar?: boolean;
}

export function LyricsEditor({
  value,
  onChange,
  onSave,
  autoSave = false,
  placeholder = "Введите текст песни...\n\nИспользуйте теги структуры:\n[Verse]\n[Chorus]\n[Bridge]",
  trackTitle,
  className = '',
  showSidebar = true,
}: LyricsEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  // Parse lyrics and get metrics
  const currentLine = value.slice(0, cursorPosition).split('\n').length - 1;
  const { sections, metrics, currentSection, navigateToSection } = useLyricsParser(value, currentLine);
  
  // Auto-save functionality
  const { forceSave, hasUnsavedChanges } = useLyricsAutoSave(value, {
    enabled: autoSave,
    onSave,
  });
  
  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  }, []);
  
  // Handle text changes
  const handleChange = useCallback((newValue: string) => {
    // Add to undo stack
    if (value !== newValue && value.length > 0) {
      setUndoStack(prev => [...prev.slice(-19), value]); // Keep last 20 states
      setRedoStack([]); // Clear redo stack on new change
    }
    
    onChange(newValue);
    
    // Handle autocomplete
    if (textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const beforeCursor = newValue.slice(0, cursor);
      const currentWord = beforeCursor.split(/\s/).pop() || '';
      
      if (currentWord.startsWith('[') && !currentWord.includes(']')) {
        const suggestions = autoCompleteStructureTag(currentWord.slice(1));
        if (suggestions.length > 0) {
          setAutocompleteOptions(suggestions);
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
    }
  }, [value, onChange]);
  
  // Insert structure tag
  const handleInsertStructure = useCallback((tag: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newValue = value.slice(0, start) + tag + '\n' + value.slice(end);
    
    handleChange(newValue);
    
    // Move cursor after inserted tag
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + tag.length + 1;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 10);
  }, [value, handleChange]);
  
  // Search functionality
  const handleSearch = useCallback(() => {
    if (!searchTerm) return;
    
    const results: number[] = [];
    const lines = value.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const regex = new RegExp(searchTerm, 'gi');
      let match;
      while ((match = regex.exec(line)) !== null) {
        results.push(lineIndex);
      }
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    // Jump to first result
    if (results.length > 0) {
      navigateToLine(results[0]);
    }
  }, [searchTerm, value]);
  
  // Navigate to specific line
  const navigateToLine = useCallback((lineNumber: number) => {
    if (!textareaRef.current) return;
    
    const lines = value.split('\n');
    let position = 0;
    
    for (let i = 0; i < lineNumber && i < lines.length; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    textareaRef.current.setSelectionRange(position, position);
    textareaRef.current.focus();
    textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [value]);
  
  // Replace functionality
  const handleReplace = useCallback(() => {
    if (!searchTerm || !replaceTerm) return;
    
    const newValue = value.replace(new RegExp(searchTerm, 'g'), replaceTerm);
    handleChange(newValue);
    setSearchTerm('');
    setReplaceTerm('');
    setShowSearch(false);
  }, [value, searchTerm, replaceTerm, handleChange]);
  
  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [value, ...prev.slice(0, 19)]);
      setUndoStack(prev => prev.slice(0, -1));
      onChange(previousState);
    }
  }, [undoStack, value, onChange]);
  
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev.slice(-19), value]);
      setRedoStack(prev => prev.slice(1));
      onChange(nextState);
    }
  }, [redoStack, value, onChange]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== textareaRef.current) return;
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (onSave) forceSave();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
          case 'f':
            e.preventDefault();
            setShowSearch(true);
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [forceSave, handleUndo, handleRedo, onSave]);
  
  return (
    <div className={`lyrics-editor ${className}`}>
      <div className="flex gap-4 h-[600px]">
        {/* Main Editor */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <LyricsToolbar
            onInsertStructure={handleInsertStructure}
            onSearch={() => setShowSearch(true)}
            onSave={() => onSave && forceSave()}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onExport={() => setShowExport(true)}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            hasUnsavedChanges={hasUnsavedChanges}
          />
          
          {/* Search Bar */}
          {showSearch && (
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Input
                  placeholder="Заменить на..."
                  value={replaceTerm}
                  onChange={(e) => setReplaceTerm(e.target.value)}
                  className="h-8"
                />
                <Button size="sm" onClick={handleReplace} disabled={!searchTerm || !replaceTerm}>
                  <Replace className="h-4 w-4" />
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {currentSearchIndex + 1} из {searchResults.length}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Text Editor */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              onSelect={handleCursorChange}
              onKeyUp={handleCursorChange}
              onClick={handleCursorChange}
              placeholder={placeholder}
              className="w-full h-full p-4 resize-none border-0 bg-transparent focus:outline-none font-mono text-sm leading-relaxed"
              style={{
                lineHeight: '1.6',
                tabSize: 2,
              }}
            />
            
            {/* Autocomplete */}
            {showAutocomplete && autocompleteOptions.length > 0 && (
              <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
                <PopoverTrigger asChild>
                  <div className="absolute" style={{ 
                    left: '20px', 
                    top: `${(currentLine * 1.6 + 1) * 16 + 20}px` 
                  }} />
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                  {autocompleteOptions.map((option) => (
                    <Button
                      key={option}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        handleInsertStructure(option);
                        setShowAutocomplete(false);
                      }}
                    >
                      {option}
                    </Button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </Card>
        
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 space-y-4">
            <LyricsStructurePanel
              sections={sections}
              currentSection={currentSection}
              onSectionClick={navigateToSection}
            />
            
            <LyricsMetrics metrics={metrics} />
          </div>
        )}
      </div>
      
      {/* Export Dialog */}
      <LyricsExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        lyrics={value}
        trackTitle={trackTitle}
      />
    </div>
  );
}