import { Music, Users, FolderOpen, Zap, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  // Mock data - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Total Projects",
      value: "12",
      description: "+2 from last month",
      icon: FolderOpen,
      trend: "up"
    },
    {
      title: "Artists",
      value: "5",
      description: "+1 new artist",
      icon: Users,
      trend: "up"
    },
    {
      title: "AI Generations",
      value: "47",
      description: "+12 this week",
      icon: Zap,
      trend: "up"
    },
    {
      title: "Tracks Created",
      value: "89",
      description: "+23 completed",
      icon: Music,
      trend: "up"
    }
  ];

  const recentProjects = [
    {
      id: "1",
      title: "Electronic Dreams",
      artist: "Digital Soundscapes",
      status: "In Progress",
      progress: 75,
      lastUpdated: "2 hours ago"
    },
    {
      id: "2", 
      title: "Ambient Journey",
      artist: "Zen Productions",
      status: "Draft",
      progress: 30,
      lastUpdated: "1 day ago"
    },
    {
      id: "3",
      title: "Rock Revival",
      artist: "Classic Vibes",
      status: "Published",
      progress: 100,
      lastUpdated: "3 days ago"
    }
  ];

  const recentGenerations = [
    {
      id: "1",
      prompt: "Electronic ambient track with ethereal vocals",
      status: "completed",
      service: "suno",
      createdAt: "1 hour ago"
    },
    {
      id: "2",
      prompt: "Upbeat pop song with guitar riffs",
      status: "processing",
      service: "mureka", 
      createdAt: "3 hours ago"
    },
    {
      id: "3",
      prompt: "Jazz fusion instrumental piece",
      status: "completed",
      service: "suno",
      createdAt: "5 hours ago"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-primary-foreground/80 mb-4">
          Ready to create some amazing music today? Let's see what you've been working on.
        </p>
        <Button 
          variant="secondary" 
          className="bg-white/20 hover:bg-white/30 text-primary-foreground border-white/20"
        >
          <Zap className="mr-2 h-4 w-4" />
          Generate New Track
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FolderOpen className="mr-2 h-5 w-5" />
              Recent Projects
            </CardTitle>
            <CardDescription>Your latest music projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{project.title}</h4>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {project.lastUpdated}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.artist}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{project.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Projects
            </Button>
          </CardContent>
        </Card>

        {/* Recent AI Generations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Recent AI Generations
            </CardTitle>
            <CardDescription>Your latest AI-generated tracks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentGenerations.map((generation) => (
              <div key={generation.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
                <div className="space-y-1 flex-1">
                  <p className="text-sm">{generation.prompt}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      generation.status === 'completed' ? 'bg-success/10 text-success' :
                      generation.status === 'processing' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {generation.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{generation.service}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {generation.createdAt}
                  </span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <Zap className="mr-2 h-4 w-4" />
              Generate New Track
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}