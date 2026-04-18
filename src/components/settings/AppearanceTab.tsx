import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Sun, Moon, Monitor, Palette, LayoutGrid, Type, Layers, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const DENSITY_KEY = 'kalm_density_preference';
const FONT_SIZE_KEY = 'kalm_font_size';
const FLASHCARD_INTERVAL_KEY = 'kalm_flashcard_interval';

const FONT_SIZE_OPTIONS = [
  { value: '0.9', label: 'Small' },
  { value: '1', label: 'Medium' },
  { value: '1.1', label: 'Large' },
] as const;

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem(DENSITY_KEY) as 'comfortable' | 'compact') || 'comfortable';
  });

  const [fontScale, setFontScale] = useState<string>(() => {
    return localStorage.getItem(FONT_SIZE_KEY) || '1';
  });

  const [flashcardInterval, setFlashcardInterval] = useState<number>(() => {
    const stored = localStorage.getItem(FLASHCARD_INTERVAL_KEY);
    return stored ? Number(stored) : 7;
  });

  // Density — persist + apply class to <html>
  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
    if (density === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
  }, [density]);

  // Font scale — persist + apply CSS variable
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontScale);
    document.documentElement.style.setProperty('--app-font-scale', fontScale);
  }, [fontScale]);

  // Flashcard interval — persist only
  useEffect(() => {
    localStorage.setItem(FLASHCARD_INTERVAL_KEY, String(flashcardInterval));
  }, [flashcardInterval]);

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Theme
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Switches the app between light, dark, or your operating-system preference. Applies instantly across every page.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Choose between light, dark, or system theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    theme === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Display Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Display Density
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <strong>Comfortable</strong> uses generous padding for easier reading. <strong>Compact</strong> shrinks spacing so more cards, lists, and rows fit on screen — useful on small laptops.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Controls spacing and sizing across the interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDensity('comfortable')}
              className={cn(
                'text-left p-4 rounded-lg border-2 transition-all',
                density === 'comfortable'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <p className="font-medium text-sm">Comfortable</p>
              <p className="text-xs text-muted-foreground mt-1">More spacious layout</p>
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={cn(
                'text-left p-4 rounded-lg border-2 transition-all',
                density === 'compact'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <p className="font-medium text-sm">Compact</p>
              <p className="text-xs text-muted-foreground mt-1">Denser, more content visible</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reading Size */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Reading Size
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Scales every text element in the app proportionally (Small = 90%, Medium = 100%, Large = 110%). Useful for accessibility — the layout reflows automatically and stays readable on all screens.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <CardDescription>Adjust text size across the interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFontScale(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  fontScale === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/30'
                )}
              >
                <span
                  className="font-medium"
                  style={{ fontSize: `${parseFloat(opt.value) * 0.875}rem` }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flashcard Behaviour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Flashcard Behaviour
          </CardTitle>
          <CardDescription>
            Default auto-flip speed for flashcard slideshows. Per-chapter settings take priority over this default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-flip speed</Label>
              <span className="text-sm font-medium text-muted-foreground">{flashcardInterval}s</span>
            </div>
            <Slider
              min={3}
              max={15}
              step={1}
              value={[flashcardInterval]}
              onValueChange={([v]) => setFlashcardInterval(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3s (fast)</span>
              <span>15s (slow)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
