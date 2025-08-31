import { ReactNode } from 'react';

interface TelegramPageLayoutProps {
  children: ReactNode;
  className?: string;
}

export const TelegramPageLayout = ({ children, className }: TelegramPageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background p-4 ${className}`}>
      {children}
    </div>
  );
};

export const TelegramSection = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={`p-4 ${className || ''}`}>
    {children}
  </section>
);