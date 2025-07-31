import { Plus, Search, MoreHorizontal, User, Music, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Artists() {
  // Mock data - will be replaced with real data from Supabase
  const artists = [
    {
      id: "1",
      name: "Digital Soundscapes",
      description: "Electronic music producer specializing in ambient and atmospheric tracks",
      avatarUrl: null,
      projectsCount: 3,
      tracksCount: 24,
      createdAt: "2023-12-01",
      metadata: {
        genre: "Electronic",
        location: "Los Angeles, CA"
      }
    },
    {
      id: "2",
      name: "Chill Masters",
      description: "Lo-fi and chill hop collective creating relaxing music for study and work",
      avatarUrl: null,
      projectsCount: 2,
      tracksCount: 18,
      createdAt: "2023-11-15",
      metadata: {
        genre: "Lo-fi Hip Hop",
        location: "Tokyo, Japan"
      }
    },
    {
      id: "3",
      name: "Tropical Beats",
      description: "Summer vibes and tropical house music for the dancefloor",
      avatarUrl: null,
      projectsCount: 1,
      tracksCount: 8,
      createdAt: "2024-01-05",
      metadata: {
        genre: "Tropical House",
        location: "Miami, FL"
      }
    },
    {
      id: "4",
      name: "Neo Classical",
      description: "Modern classical composer blending traditional orchestration with contemporary elements",
      avatarUrl: null,
      projectsCount: 2,
      tracksCount: 15,
      createdAt: "2023-10-20",
      metadata: {
        genre: "Contemporary Classical",
        location: "Vienna, Austria"
      }
    }
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Artists</h1>
          <p className="text-muted-foreground">Manage your music artists and collaborators</p>
        </div>
        <Button className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          New Artist
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search artists..." 
            className="pl-10"
          />
        </div>
      </div>

      {/* Artists Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <Card key={artist.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={artist.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {getInitials(artist.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {artist.name}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <User className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Music className="mr-2 h-4 w-4" />
                          View Projects
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {artist.metadata.genre && (
                    <Badge variant="secondary" className="text-xs">
                      {artist.metadata.genre}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <CardDescription className="text-sm line-clamp-2">
                {artist.description}
              </CardDescription>

              {artist.metadata.location && (
                <p className="text-xs text-muted-foreground">
                  📍 {artist.metadata.location}
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="font-semibold text-foreground">{artist.projectsCount}</div>
                  <div className="text-muted-foreground text-xs">Projects</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="font-semibold text-foreground">{artist.tracksCount}</div>
                  <div className="text-muted-foreground text-xs">Tracks</div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Created {new Date(artist.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <User className="mr-2 h-4 w-4" />
                  View Artist
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {artists.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No artists yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first artist to start organizing your music
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Artist
          </Button>
        </div>
      )}
    </div>
  );
}