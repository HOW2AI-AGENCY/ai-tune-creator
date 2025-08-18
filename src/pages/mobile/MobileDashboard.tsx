import { useState } from "react";
import { MobilePageWrapper } from "@/components/mobile/MobilePageWrapper";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Music, 
  Play, 
  Zap, 
  TrendingUp, 
  Clock, 
  Plus,
  Headphones,
  Download,
  Share
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export function MobileDashboard() {
  const navigate = useNavigate();
  const [generationProgress] = useState(65);

  const quickStats = [
    { label: "Tracks Created", value: "42", icon: Music, color: "text-primary" },
    { label: "Hours Played", value: "127", icon: Headphones, color: "text-success" },
    { label: "Downloads", value: "18", icon: Download, color: "text-warning" },
    { label: "Shares", value: "9", icon: Share, color: "text-destructive" }
  ];

  const recentTracks = [
    {
      id: 1,
      title: "Midnight Dreams",
      style: "Ambient Electronic",
      duration: "3:42",
      status: "completed",
      artwork: "🌙"
    },
    {
      id: 2,
      title: "Summer Vibes",
      style: "Tropical House",
      duration: "4:18",
      status: "processing",
      artwork: "☀️"
    },
    {
      id: 3,
      title: "Urban Flow",
      style: "Hip-Hop",
      duration: "3:28",
      status: "completed",
      artwork: "🏙️"
    }
  ];

  return (
    <MobilePageWrapper>
      {/* Welcome Section */}
      <MobileCard variant="elevated" className="bg-gradient-primary text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">Welcome back!</h2>
            <p className="text-primary-foreground/80 text-sm">
              Ready to create amazing music?
            </p>
          </div>
          <div className="text-4xl">🎵</div>
        </div>
      </MobileCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {quickStats.map((stat, index) => (
          <MobileCard key={index} variant="outlined" padding="sm" interactive>
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-5 w-5", stat.color)} />
              <div>
                <div className="font-bold text-lg">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </MobileCard>
        ))}
      </div>

      {/* Current Generation */}
      <MobileCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Current Generation</h3>
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            Processing
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Dreamy Synthwave Track</span>
            <span>{generationProgress}%</span>
          </div>
          <Progress value={generationProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Estimated time remaining: 2 minutes
          </p>
        </div>
      </MobileCard>

      {/* Recent Tracks */}
      <MobileCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Tracks</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/tracks")}
          >
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {recentTracks.map((track) => (
            <div 
              key={track.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center text-xl">
                {track.artwork}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{track.title}</div>
                <div className="text-sm text-muted-foreground">{track.style}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{track.duration}</div>
                {track.status === "completed" ? (
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <Play className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </MobileCard>

      {/* Quick Actions */}
      <MobileCard>
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-12 gap-2" 
            onClick={() => navigate("/generate")}
          >
            <Music className="h-4 w-4" />
            Generate Track
          </Button>
          <Button 
            variant="outline" 
            className="h-12 gap-2"
            onClick={() => navigate("/tracks")}
          >
            <TrendingUp className="h-4 w-4" />
            My Library
          </Button>
        </div>
      </MobileCard>

      {/* Floating Action Button */}
      <MobileFAB
        onClick={() => navigate("/generate")}
        position="bottom-right"
      >
        <Plus className="h-6 w-6" />
      </MobileFAB>
    </MobilePageWrapper>
  );
}