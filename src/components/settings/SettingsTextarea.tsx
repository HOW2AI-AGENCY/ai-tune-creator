import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SettingsTextareaProps extends TextareaProps {
  id: string;
  label: string;
  description?: string;
}

export function SettingsTextarea({ id, label, description, ...props }: SettingsTextareaProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        {...props}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
