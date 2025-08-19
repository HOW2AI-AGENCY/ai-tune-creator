import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Plus, TrendingUp, Clock } from 'lucide-react';

interface SmartDashboardBannerProps {
  stats: {
    totalArtists: number;
    totalProjects: number;
    totalTracks: number;
    activeGenerations: number;
  };
  onCreateArtist?: () => void;
  onCreateProject?: () => void;
}

export function SmartDashboardBanner({ 
  stats, 
  onCreateArtist, 
  onCreateProject 
}: SmartDashboardBannerProps) {
  return (
    <Card className="gradient-primary text-primary-foreground p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Welcome back!</h2>
          <p className="text-primary-foreground/80">
            Continue creating amazing music
          </p>
          
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              <span className="text-sm">{stats.totalArtists} Artists</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{stats.totalProjects} Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{stats.totalTracks} Tracks</span>
            </div>
            {stats.activeGenerations > 0 && (
              <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">
                {stats.activeGenerations} Generating
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {onCreateArtist && (
            <Button 
              variant="secondary" 
              onClick={onCreateArtist}
              className="bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground border-secondary/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Artist
            </Button>
          )}
          {onCreateProject && (
            <Button 
              variant="secondary" 
              onClick={onCreateProject}
              className="bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground border-secondary/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Project
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}