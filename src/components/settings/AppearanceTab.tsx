import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor, Palette, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

const DENSITY_KEY = 'kalm_density_preference';

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem(DENSITY_KEY) as 'comfortable' | 'compact') || 'comfortable';
  });

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Theme
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

      {/* Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Display Density
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
    </div>
  );
}
