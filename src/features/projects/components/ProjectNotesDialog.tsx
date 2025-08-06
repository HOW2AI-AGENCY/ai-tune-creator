import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Music2, Lightbulb, FileText, Trash2, Search, Loader2 } from "lucide-react";

interface ProjectNote {
  id: string;
  title: string;
  content: string | null;
  note_type: 'idea' | 'reference' | 'lyric';
  metadata: any;
  created_at: string;
  updated_at: string;
  reference_research?: {
    id: string;
    reference_title: string;
    reference_artist: string;
    ai_analysis: string | null;
    analysis_data: any;
  }[];
}

interface ProjectNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
}

export function ProjectNotesDialog({ open, onOpenChange, projectId, projectTitle }: ProjectNotesDialogProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    note_type: "idea" as const,
  });

  // Reference analysis form
  const [referenceForm, setReferenceForm] = useState({
    title: "",
    artist: "",
    noteTitle: "",
    noteContent: "",
  });

  const loadNotes = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_notes')
        .select(`
          *,
          reference_research (
            id,
            reference_title,
            reference_artist,
            ai_analysis,
            analysis_data
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes((data || []) as ProjectNote[]);
    } catch (error: any) {
      console.error('Error loading notes:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить заметки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      loadNotes();
    }
  }, [open, projectId]);

  const createNote = async () => {
    if (!newNote.title.trim() || !user) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('project_notes')
        .insert({
          project_id: projectId,
          title: newNote.title,
          content: newNote.content || null,
          note_type: newNote.note_type,
          metadata: {}
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Заметка создана",
      });

      setNewNote({ title: "", content: "", note_type: "idea" });
      await loadNotes();
    } catch (error: any) {
      console.error('Error creating note:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать заметку",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const analyzeReference = async () => {
    if (!referenceForm.title.trim() || !referenceForm.artist.trim() || !user) return;

    setAnalyzing(true);
    try {
      // First create the note
      const { data: noteData, error: noteError } = await supabase
        .from('project_notes')
        .insert({
          project_id: projectId,
          title: referenceForm.noteTitle || `Референс: ${referenceForm.title}`,
          content: referenceForm.noteContent || null,
          note_type: 'reference',
          metadata: {
            reference_title: referenceForm.title,
            reference_artist: referenceForm.artist
          }
        })
        .select()
        .single();

      if (noteError) throw noteError;

      // Then call AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-reference', {
        body: {
          reference_title: referenceForm.title,
          reference_artist: referenceForm.artist,
          analysis_type: 'full',
          provider: 'openai'
        }
      });

      if (analysisError) throw analysisError;

      // Save the analysis
      const { error: researchError } = await supabase
        .from('reference_research')
        .insert({
          project_note_id: noteData.id,
          reference_title: referenceForm.title,
          reference_artist: referenceForm.artist,
          analysis_data: analysisData.analysis,
          ai_analysis: analysisData.analysis.raw_analysis || JSON.stringify(analysisData.analysis),
          ai_provider: analysisData.provider,
          ai_model: analysisData.model
        });

      if (researchError) throw researchError;

      toast({
        title: "Успешно",
        description: "Референс проанализирован ИИ",
      });

      setReferenceForm({ title: "", artist: "", noteTitle: "", noteContent: "" });
      await loadNotes();
    } catch (error: any) {
      console.error('Error analyzing reference:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось проанализировать референс",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('project_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Заметка удалена",
      });

      await loadNotes();
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить заметку",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reference': return <Music2 className="h-4 w-4" />;
      case 'lyric': return <FileText className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reference': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'lyric': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      default: return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesTab = activeTab === 'all' || note.note_type === activeTab;
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Заметки проекта: {projectTitle}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="idea">Идеи</TabsTrigger>
              <TabsTrigger value="reference">Референсы</TabsTrigger>
              <TabsTrigger value="lyric">Тексты</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск заметок..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            {/* Create new note */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Новая заметка
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Название заметки"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  />
                  <Select value={newNote.note_type} onValueChange={(value: any) => setNewNote({ ...newNote, note_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Идея</SelectItem>
                      <SelectItem value="reference">Референс</SelectItem>
                      <SelectItem value="lyric">Текст</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Содержание заметки..."
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  rows={3}
                />
                <Button onClick={createNote} disabled={creating || !newNote.title.trim()}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Создать заметку
                </Button>
              </CardContent>
            </Card>

            {/* AI Reference Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-4 w-4" />
                  ИИ Анализ референса
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Название трека/альбома"
                    value={referenceForm.title}
                    onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                  />
                  <Input
                    placeholder="Артист"
                    value={referenceForm.artist}
                    onChange={(e) => setReferenceForm({ ...referenceForm, artist: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Название заметки (опционально)"
                  value={referenceForm.noteTitle}
                  onChange={(e) => setReferenceForm({ ...referenceForm, noteTitle: e.target.value })}
                />
                <Textarea
                  placeholder="Дополнительные комментарии..."
                  value={referenceForm.noteContent}
                  onChange={(e) => setReferenceForm({ ...referenceForm, noteContent: e.target.value })}
                  rows={2}
                />
                <Button onClick={analyzeReference} disabled={analyzing || !referenceForm.title.trim() || !referenceForm.artist.trim()}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Анализировать референс
                </Button>
              </CardContent>
            </Card>

            {/* Notes list */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Загрузка заметок...</p>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Заметки не найдены</p>
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <Card key={note.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getTypeColor(note.note_type)}>
                              {getTypeIcon(note.note_type)}
                              <span className="ml-1">
                                {note.note_type === 'idea' ? 'Идея' : note.note_type === 'reference' ? 'Референс' : 'Текст'}
                              </span>
                            </Badge>
                            <CardTitle className="text-base">{note.title}</CardTitle>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {note.content && (
                          <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                        )}
                        
                        {/* Reference analysis results */}
                        {note.reference_research && note.reference_research.length > 0 && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-semibold mb-2">ИИ Анализ</h4>
                            {note.reference_research.map((research) => (
                              <div key={research.id} className="space-y-2">
                                <p className="text-sm font-medium">
                                  {research.reference_title} - {research.reference_artist}
                                </p>
                                {research.ai_analysis && (
                                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {research.ai_analysis}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground mt-3">
                          {new Date(note.created_at).toLocaleString('ru-RU')}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Other tab contents would filter notes by type */}
          <TabsContent value="idea">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(note.note_type)}>
                            {getTypeIcon(note.note_type)}
                            <span className="ml-1">
                              {note.note_type === 'idea' ? 'Идея' : note.note_type === 'reference' ? 'Референс' : 'Текст'}
                            </span>
                          </Badge>
                          <CardTitle className="text-base">{note.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                      )}
                      
                      {/* Reference analysis results */}
                      {note.reference_research && note.reference_research.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">ИИ Анализ</h4>
                          {note.reference_research.map((research) => (
                            <div key={research.id} className="space-y-2">
                              <p className="text-sm font-medium">
                                {research.reference_title} - {research.reference_artist}
                              </p>
                              {research.ai_analysis && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {research.ai_analysis}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(note.created_at).toLocaleString('ru-RU')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reference">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(note.note_type)}>
                            {getTypeIcon(note.note_type)}
                            <span className="ml-1">
                              {note.note_type === 'idea' ? 'Идея' : note.note_type === 'reference' ? 'Референс' : 'Текст'}
                            </span>
                          </Badge>
                          <CardTitle className="text-base">{note.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                      )}
                      
                      {/* Reference analysis results */}
                      {note.reference_research && note.reference_research.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">ИИ Анализ</h4>
                          {note.reference_research.map((research) => (
                            <div key={research.id} className="space-y-2">
                              <p className="text-sm font-medium">
                                {research.reference_title} - {research.reference_artist}
                              </p>
                              {research.ai_analysis && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {research.ai_analysis}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(note.created_at).toLocaleString('ru-RU')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="lyric">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(note.note_type)}>
                            {getTypeIcon(note.note_type)}
                            <span className="ml-1">
                              {note.note_type === 'idea' ? 'Идея' : note.note_type === 'reference' ? 'Референс' : 'Текст'}
                            </span>
                          </Badge>
                          <CardTitle className="text-base">{note.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {note.content && (
                        <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                      )}
                      
                      {/* Reference analysis results */}
                      {note.reference_research && note.reference_research.length > 0 && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">ИИ Анализ</h4>
                          {note.reference_research.map((research) => (
                            <div key={research.id} className="space-y-2">
                              <p className="text-sm font-medium">
                                {research.reference_title} - {research.reference_artist}
                              </p>
                              {research.ai_analysis && (
                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {research.ai_analysis}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(note.created_at).toLocaleString('ru-RU')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
