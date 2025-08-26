import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComponentProps } from "react";

interface SettingsInputProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  description?: string;
}

export function SettingsInput({ id, label, description, ...props }: SettingsInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        {...props}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
