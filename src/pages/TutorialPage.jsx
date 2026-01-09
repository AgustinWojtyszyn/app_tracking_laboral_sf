import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, LogIn, ClipboardList, Users, CalendarDays, Settings, ShieldCheck, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const steps = [
  { key: 'step1', icon: LogIn, cta: { to: '/login' } },
  { key: 'step2', icon: Settings, cta: { to: '/app/configuracion' } },
  { key: 'step3', icon: ClipboardList, cta: { to: '/app/trabajos-diarios' } },
  { key: 'step4', icon: Users, cta: { to: '/app/grupos' } },
  { key: 'step5', icon: CalendarDays, cta: { to: '/app/panel-mensual' } },
  { key: 'step6', icon: ShieldCheck, cta: { to: '/app/admin', adminOnly: true } },
];

export default function TutorialPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 dark:bg-slate-900 dark:border-slate-800">
          <BookOpen className="w-8 h-8 text-[#1e3a8a]" />
        </div>
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-50">{t('tutorial.title')}</h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-slate-300">
            {t('tutorial.intro')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map(({ key, icon: Icon, cta, adminOnly }) => (
          <Card key={key} className="card-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center gap-3 p-6">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 dark:bg-slate-800 dark:border-slate-700">
                <Icon className="w-7 h-7 text-[#1e3a8a]" />
              </div>
              <CardTitle className="text-xl md:text-2xl text-gray-900 dark:text-slate-50">{t(`tutorial.steps.${key}Title`)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6 pt-2">
              <ul className="space-y-3 text-base md:text-lg text-gray-700 dark:text-slate-200">
                {[1, 2].map((idx) => (
                  <li key={`${key}-${idx}`} className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-500" />
                    <span>{t(`tutorial.steps.${key}${idx === 1 ? 'a' : 'b'}`)}</span>
                  </li>
                ))}
              </ul>
              {cta && (!adminOnly ? (
                <Link to={cta.to}>
                  <Button className="w-full justify-center h-12 text-lg bg-[#1e3a8a] hover:bg-blue-900 text-white">
                    {t(`tutorial.steps.${key}Cta`)}
                  </Button>
                </Link>
              ) : (
                <Link to={cta.to}>
                  <Button variant="outline" className="w-full justify-center h-12 text-lg border-gray-300 text-gray-900 hover:bg-gray-100 dark:text-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    {t(`tutorial.steps.${key}Cta`)} {t('tutorial.steps.adminOnly')}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
