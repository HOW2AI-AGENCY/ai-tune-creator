import { Plus, Search, Filter, MoreHorizontal, FolderOpen, Music, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Projects() {
  // Mock data - will be replaced with real data from Supabase
  const projects = [
    {
      id: "1",
      title: "Electronic Dreams",
      description: "A collection of ambient electronic tracks with ethereal soundscapes",
      type: "album",
      status: "published",
      coverUrl: null,
      tracksCount: 8,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20",
      artist: {
        name: "Digital Soundscapes"
      }
    },
    {
      id: "2", 
      title: "Midnight Vibes",
      description: "Late night chill tracks perfect for relaxation",
      type: "ep",
      status: "draft",
      coverUrl: null,
      tracksCount: 4,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18",
      artist: {
        name: "Chill Masters"
      }
    },
    {
      id: "3",
      title: "Summer Anthem",
      description: "Upbeat summer single with tropical vibes",
      type: "single",
      status: "published",
      coverUrl: null,
      tracksCount: 1,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
      artist: {
        name: "Tropical Beats"
      }
    },
    {
      id: "4",
      title: "Classical Fusion",
      description: "Modern take on classical compositions",
      type: "album",
      status: "draft",
      coverUrl: null,
      tracksCount: 12,
      createdAt: "2023-12-20",
      updatedAt: "2024-01-12",
      artist: {
        name: "Neo Classical"
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'draft':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      case 'archived':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      case 'ep':
        return 'bg-secondary/10 text-secondary hover:bg-secondary/20';
      case 'single':
        return 'bg-accent/10 text-accent-foreground hover:bg-accent/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your music projects and albums</p>
        </div>
        <Button className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={getTypeColor(project.type)}>
                      {project.type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    by {project.artist.name}
                  </CardDescription>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Music className="mr-2 h-4 w-4" />
                      Add Track
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{project.tracksCount} tracks</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Open Project
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first music project to get started
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      )}
    </div>
  );
}