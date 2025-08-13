import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { TrackDetailsDialog } from "@/components/ui/track-details-dialog";
import { 
  Search, 
  Play, 
  Heart, 
  Download, 
  MoreHorizontal, 
  Filter,
  ChevronDown,
  Music,
  Clock
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number?: number;
  duration?: number;
  lyrics?: string;
  description?: string;
  genre_tags?: string[];
  style_prompt?: string;
  current_version?: number;
  created_at?: string;
  updated_at?: string;
  audio_url?: string;
  metadata?: any;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface GenerationItem {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: string;
  result_url?: string;
  created_at: string;
  track?: Track;
}

export default function AIGenerationNew() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("popular");
  const [duration, setDuration] = useState("all");
  const [vocalType, setVocalType] = useState("all");
  
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showTrackDetails, setShowTrackDetails] = useState(false);

  // Filter options
  const moods = [
    { id: "chill", label: "Chill" },
    { id: "dramatic", label: "Dramatic" },
    { id: "happy", label: "Happy" },
    { id: "sad", label: "Sad" },
    { id: "hopeful", label: "Hopeful" },
    { id: "fantasy", label: "Fantasy" },
    { id: "romantic", label: "Romantic" },
    { id: "relaxing", label: "Relaxing" },
  ];

  const instruments = [
    { id: "piano", label: "Piano" },
    { id: "guitar", label: "Guitar" },
    { id: "violin", label: "Violin" },
    { id: "drums", label: "Drums" },
    { id: "synth", label: "Synth" },
    { id: "bass", label: "Bass" },
  ];

  const genres = [
    { id: "pop", label: "Pop" },
    { id: "rock", label: "Rock" },
    { id: "electronic", label: "Electronic" },
    { id: "jazz", label: "Jazz" },
    { id: "classical", label: "Classical" },
    { id: "hip-hop", label: "Hip-Hop" },
  ];

  useEffect(() => {
    if (!user) return;
    
    fetchGenerations();
    fetchTracks();
  }, [user]);

  const fetchGenerations = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_generations")
        .select(`
          id,
          prompt,
          service,
          status,
          result_url,
          created_at,
          track_id
        `)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch track details for generations with track_id
      const trackIds = data?.filter(g => g.track_id).map(g => g.track_id) || [];
      let trackData: any[] = [];
      
      if (trackIds.length > 0) {
        const { data: tracksData, error: tracksError } = await supabase
          .from("tracks")
          .select(`
            id,
            title,
            track_number,
            duration,
            lyrics,
            description,
            genre_tags,
            style_prompt,
            current_version,
            created_at,
            updated_at,
            audio_url,
            metadata,
            projects(
              title,
              artists(name)
            )
          `)
          .in("id", trackIds);

        if (!tracksError) {
          trackData = tracksData || [];
        }
      }

      const enrichedGenerations = data?.map(gen => ({
        ...gen,
        service: gen.service as 'suno' | 'mureka',
        track: trackData.find(t => t.id === gen.track_id)
      })) || [];

      setGenerations(enrichedGenerations);
    } catch (error) {
      console.error("Error fetching generations:", error);
    }
  };

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          track_number,
          duration,
          lyrics,
          description,
          genre_tags,
          style_prompt,
          current_version,
          created_at,
          updated_at,
          audio_url,
          metadata,
          projects(
            title,
            artists(name)
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    }
  };

  const filteredGenerations = useMemo(() => {
    return generations.filter(gen => {
      if (searchQuery && !gen.prompt.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !gen.track?.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (selectedGenres.length > 0 && gen.track?.genre_tags) {
        const hasMatchingGenre = selectedGenres.some(genre => 
          gen.track?.genre_tags?.includes(genre)
        );
        if (!hasMatchingGenre) return false;
      }

      return true;
    });
  }, [generations, searchQuery, selectedGenres]);

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setShowTrackDetails(true);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Войдите в систему</h2>
            <p className="text-muted-foreground">
              Для просмотра генераций и треков необходимо войти в систему
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border p-4 space-y-6 h-screen overflow-y-auto">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filter</span>
          </div>

          {/* Mood Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Mood</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              {moods.map(mood => (
                <div key={mood.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={mood.id}
                    checked={selectedMoods.includes(mood.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMoods([...selectedMoods, mood.id]);
                      } else {
                        setSelectedMoods(selectedMoods.filter(m => m !== mood.id));
                      }
                    }}
                    className="border-border data-[state=checked]:bg-primary"
                  />
                  <label htmlFor={mood.id} className="text-sm cursor-pointer">
                    {mood.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Instrument Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Instrument</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              {instruments.map(instrument => (
                <div key={instrument.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={instrument.id}
                    checked={selectedInstruments.includes(instrument.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedInstruments([...selectedInstruments, instrument.id]);
                      } else {
                        setSelectedInstruments(selectedInstruments.filter(i => i !== instrument.id));
                      }
                    }}
                    className="border-border data-[state=checked]:bg-primary"
                  />
                  <label htmlFor={instrument.id} className="text-sm cursor-pointer">
                    {instrument.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Genre</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              {genres.map(genre => (
                <div key={genre.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={genre.id}
                    checked={selectedGenres.includes(genre.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      } else {
                        setSelectedGenres(selectedGenres.filter(g => g !== genre.id));
                      }
                    }}
                    className="border-border data-[state=checked]:bg-primary"
                  />
                  <label htmlFor={genre.id} className="text-sm cursor-pointer">
                    {genre.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Music or Background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
              
              <div className="flex items-center gap-4 ml-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="relevant">Relevant</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-32 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Duration</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={vocalType} onValueChange={setVocalType}>
                  <SelectTrigger className="w-48 bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">Vocal & Instrumental</SelectItem>
                    <SelectItem value="vocal">Vocal Only</SelectItem>
                    <SelectItem value="instrumental">Instrumental Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredGenerations.map((generation) => (
                <Card 
                  key={generation.id} 
                  className="bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => generation.track && handleTrackClick(generation.track)}
                >
                  <CardContent className="p-0 relative">
                    {/* Cover Image Placeholder */}
                    <div className="aspect-square bg-gradient-to-br from-muted to-accent relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="h-12 w-12 text-muted-foreground" />
                      </div>
                      
                      {/* Overlay Controls */}
                      <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 p-0"
                          >
                            <Play className="h-5 w-5 ml-0.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                            <Heart className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Duration Badge */}
                      {generation.track?.duration && (
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="secondary" className="bg-background/80 text-foreground text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(generation.track.duration)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="p-3 space-y-1">
                      <h3 className="font-medium text-sm truncate">
                        {generation.track?.title || generation.prompt.slice(0, 30) + "..."}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {generation.track?.project?.artist?.name || "Unknown Artist"}
                      </p>
                      
                      {/* Service Badge */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs border-border text-foreground"
                        >
                          {generation.service}
                        </Badge>
                        
                        {generation.track?.genre_tags && generation.track.genre_tags.length > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-muted text-muted-foreground"
                          >
                            {generation.track.genre_tags[0]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredGenerations.length === 0 && (
              <div className="text-center py-12">
                <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Генерации не найдены
                </h3>
                <p className="text-muted-foreground">
                  Попробуйте изменить фильтры или создать новую генерацию
                </p>
              </div>
            )}

            {/* View More Button */}
            {filteredGenerations.length > 0 && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  View More
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Track Details Dialog */}
      <TrackDetailsDialog
        open={showTrackDetails}
        onOpenChange={setShowTrackDetails}
        track={selectedTrack}
      />
    </div>
  );
}