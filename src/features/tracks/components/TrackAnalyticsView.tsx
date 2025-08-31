import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Music,
  Clock,
  Calendar,
  Zap,
  Target,
  Users,
  Headphones,
  Download
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  description?: string | null;
  genre_tags?: string[] | null;
  projects?: {
    title: string;
    artists?: {
      name: string;
    };
  };
}

interface TrackAnalyticsViewProps {
  tracks: Track[];
  className?: string;
}

interface GenreStats {
  genre: string;
  count: number;
  percentage: number;
  avgDuration: number;
  totalDuration: number;
}

interface TimeStats {
  period: string;
  count: number;
  duration: number;
}

export const TrackAnalyticsView = memo(({ tracks, className }: TrackAnalyticsViewProps) => {
  const analytics = useMemo(() => {
    if (tracks.length === 0) return null;

    // Basic stats
    const totalTracks = tracks.length;
    const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const avgDuration = totalDuration / totalTracks;
    const tracksWithAudio = tracks.filter(track => track.audio_url).length;
    const completionRate = (tracksWithAudio / totalTracks) * 100;

    // Genre analysis
    const genreCount: Record<string, { count: number; totalDuration: number }> = {};
    tracks.forEach(track => {
      if (track.genre_tags) {
        track.genre_tags.forEach(genre => {
          if (!genreCount[genre]) {
            genreCount[genre] = { count: 0, totalDuration: 0 };
          }
          genreCount[genre].count++;
          genreCount[genre].totalDuration += track.duration || 0;
        });
      }
    });

    const genreStats: GenreStats[] = Object.entries(genreCount)
      .map(([genre, stats]) => ({
        genre,
        count: stats.count,
        percentage: (stats.count / totalTracks) * 100,
        avgDuration: stats.totalDuration / stats.count,
        totalDuration: stats.totalDuration
      }))
      .sort((a, b) => b.count - a.count);

    // Time-based analysis (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentTracks = tracks.filter(track => 
      new Date(track.created_at) >= thirtyDaysAgo
    );

    // Weekly breakdown
    const weeklyStats: TimeStats[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekTracks = tracks.filter(track => {
        const trackDate = new Date(track.created_at);
        return trackDate >= weekStart && trackDate < weekEnd;
      });
      
      weeklyStats.unshift({
        period: `Week ${4 - i}`,
        count: weekTracks.length,
        duration: weekTracks.reduce((sum, track) => sum + (track.duration || 0), 0)
      });
    }

    // Version analysis
    const versionStats = tracks.reduce((acc, track) => {
      const version = track.current_version;
      acc[version] = (acc[version] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const multiVersionTracks = Object.entries(versionStats)
      .filter(([version]) => parseInt(version) > 1)
      .reduce((sum, [, count]) => sum + count, 0);

    // Project distribution
    const projectStats = tracks.reduce((acc, track) => {
      const projectTitle = track.projects?.title || 'Unknown';
      if (!acc[projectTitle]) {
        acc[projectTitle] = { count: 0, duration: 0 };
      }
      acc[projectTitle].count++;
      acc[projectTitle].duration += track.duration || 0;
      return acc;
    }, {} as Record<string, { count: number; duration: number }>);

    const topProjects = Object.entries(projectStats)
      .map(([project, stats]) => ({ project, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTracks,
      totalDuration,
      avgDuration,
      tracksWithAudio,
      completionRate,
      genreStats,
      weeklyStats,
      versionStats,
      multiVersionTracks,
      topProjects,
      recentTracks: recentTracks.length,
      productivityTrend: recentTracks.length > tracks.length * 0.3 ? 'up' : 
                        recentTracks.length < tracks.length * 0.1 ? 'down' : 'stable'
    };
  }, [tracks]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${Math.floor(seconds % 60)}s`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!analytics) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
            <p className="text-muted-foreground text-center">
              Create some tracks to see detailed analytics and insights
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Track Analytics & Insights
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tracks</p>
                  <p className="text-2xl font-bold">{analytics.totalTracks}</p>
                </div>
                <Music className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {analytics.productivityTrend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {analytics.productivityTrend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {analytics.recentTracks} created in last 30 days
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(analytics.totalDuration)}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Avg: {formatTime(Math.round(analytics.avgDuration))} per track
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{Math.round(analytics.completionRate)}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2">
                <Progress value={analytics.completionRate} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.tracksWithAudio} tracks have audio
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Iterations</p>
                  <p className="text-2xl font-bold">{analytics.multiVersionTracks}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Tracks with multiple versions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Genre Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Genre Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.genreStats.slice(0, 6).map((genre, index) => (
                  <div key={genre.genre} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{genre.genre}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {genre.count} tracks
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(genre.percentage)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={genre.percentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Avg: {formatTime(Math.round(genre.avgDuration))}</span>
                      <span>Total: {formatDuration(genre.totalDuration)}</span>
                    </div>
                  </div>
                ))}
                {analytics.genreStats.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{analytics.genreStats.length - 6} more genres
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.weeklyStats.map((week, index) => {
                  const maxCount = Math.max(...analytics.weeklyStats.map(w => w.count));
                  const percentage = maxCount > 0 ? (week.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={week.period} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{week.period}</span>
                        <div className="text-sm text-muted-foreground">
                          {week.count} tracks
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(week.duration)} total duration
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.topProjects.map((project, index) => (
                <Card key={project.project} className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate">{project.project}</h4>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Music className="h-3 w-3" />
                        <span>{project.count} tracks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(project.duration)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Version Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Version Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(analytics.versionStats)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([version, count]) => (
                <Card key={version} className="bg-muted/20 text-center">
                  <CardContent className="p-3">
                    <div className="text-lg font-bold">v{version}</div>
                    <div className="text-sm text-muted-foreground">
                      {count} tracks
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round((count / analytics.totalTracks) * 100)}%
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
});

TrackAnalyticsView.displayName = 'TrackAnalyticsView';