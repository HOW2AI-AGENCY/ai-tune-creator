import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ThemeSelectorProps {
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function ThemeSelector({ theme, onThemeChange }: ThemeSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>Тема</Label>
        <p className="text-sm text-muted-foreground">
          Выберите тему приложения
        </p>
      </div>
      <Select value={theme} onValueChange={onThemeChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Светлая</SelectItem>
          <SelectItem value="dark">Темная</SelectItem>
          <SelectItem value="system">Системная</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
