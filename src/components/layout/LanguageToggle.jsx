import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`h-10 px-4 rounded-full border-border/70 bg-background/80 hover:bg-accent hover:text-accent-foreground text-sm font-semibold ${className}`}
    >
      {isEnglish ? 'ES' : 'EN'}
    </Button>
  );
}
