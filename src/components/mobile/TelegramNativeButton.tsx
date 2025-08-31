import { Button, ButtonProps } from '@/components/ui/button';

interface TelegramNativeButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const TelegramNativeButton = ({ children, ...props }: TelegramNativeButtonProps) => {
  return (
    <Button {...props} className="w-full">
      {children}
    </Button>
  );
};