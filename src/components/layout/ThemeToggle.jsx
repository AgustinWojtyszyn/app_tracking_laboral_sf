import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className={`h-12 w-12 rounded-full border border-border/60 bg-background/40 hover:bg-accent/70 hover:text-accent-foreground text-lg ${className}`}
    >
      {isDark ? (
        <Sun className="h-[1.35rem] w-[1.35rem]" />
      ) : (
        <Moon className="h-[1.35rem] w-[1.35rem]" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
