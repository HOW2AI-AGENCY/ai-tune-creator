import { Music, Users, FolderOpen, Zap, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/useTranslation";

export default function Dashboard() {
  const { t } = useTranslation();
  
  // Mock data - will be replaced with real data from Supabase
  const stats = [
    {
      title: "Всего проектов",
      value: "12",
      description: "+2 за последний месяц",
      icon: FolderOpen,
      trend: "up"
    },
    {
      title: "Артисты",
      value: "5",
      description: "+1 новый артист",
      icon: Users,
      trend: "up"
    },
    {
      title: "ИИ генераций",
      value: "47",
      description: "+12 на этой неделе",
      icon: Zap,
      trend: "up"
    },
    {
      title: "Треков создано",
      value: "89",
      description: "+23 завершено",
      icon: Music,
      trend: "up"
    }
  ];

  const recentProjects = [
    {
      id: "1",
      title: "Электронные мечты",
      artist: "Digital Soundscapes",
      status: "В работе",
      progress: 75,
      lastUpdated: "2 часа назад"
    },
    {
      id: "2", 
      title: "Эмбиент путешествие",
      artist: "Zen Productions",
      status: "Черновик",
      progress: 30,
      lastUpdated: "1 день назад"
    },
    {
      id: "3",
      title: "Рок возрождение",
      artist: "Classic Vibes",
      status: "Опубликован",
      progress: 100,
      lastUpdated: "3 дня назад"
    }
  ];

  const recentGenerations = [
    {
      id: "1",
      prompt: "Электронный эмбиент трек с эфирным вокалом",
      status: "завершен",
      service: "suno",
      createdAt: "1 час назад"
    },
    {
      id: "2",
      prompt: "Оптимистичная поп-песня с гитарными риффами",
      status: "обрабатывается",
      service: "mureka", 
      createdAt: "3 часа назад"
    },
    {
      id: "3",
      prompt: "Джаз-фьюжн инструментальная композиция",
      status: "завершен",
      service: "suno",
      createdAt: "5 часов назад"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Добро пожаловать!</h1>
        <p className="text-primary-foreground/80 mb-4">
          Готовы создать потрясающую музыку сегодня? Давайте посмотрим, над чем вы работали.
        </p>
        <Button 
          variant="secondary" 
          className="bg-white/20 hover:bg-white/30 text-primary-foreground border-white/20"
        >
          <Zap className="mr-2 h-4 w-4" />
          Создать новый трек
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
              Последние проекты
            </CardTitle>
            <CardDescription>Ваши новейшие музыкальные проекты</CardDescription>
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
              Посмотреть все проекты
            </Button>
          </CardContent>
        </Card>

        {/* Recent AI Generations */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Последние ИИ генерации
            </CardTitle>
            <CardDescription>Ваши новейшие треки, созданные ИИ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentGenerations.map((generation) => (
              <div key={generation.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors">
                <div className="space-y-1 flex-1">
                  <p className="text-sm">{generation.prompt}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      generation.status === 'завершен' ? 'bg-success/10 text-success' :
                      generation.status === 'обрабатывается' ? 'bg-warning/10 text-warning' :
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
              Создать новый трек
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}