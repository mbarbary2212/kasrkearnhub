import MainLayout from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useYears } from '@/hooks/useYears';
import { useAuthContext } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { getYearIcon } from '@/lib/yearIcons';
import { cn } from '@/lib/utils';

export default function AllYearsPage() {
  const navigate = useNavigate();
  const { data: years, isLoading } = useYears();
  const { profile } = useAuthContext();

  const handleSelectYear = (yearNumber: number) => {
    navigate('/');
    // The Home page will pick up the year from the dropdown
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-foreground">
            All Years
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select an academic year to explore its modules
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {years?.map((year) => {
              const icon = getYearIcon(year.number);
              const isPreferred = profile?.preferred_year_id === year.id;
              return (
                <Card
                  key={year.id}
                  onClick={() => handleSelectYear(year.number)}
                  className={cn(
                    'p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group',
                    'hover:border-primary/30',
                    isPreferred && 'border-primary/40 bg-primary/5'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {icon && (
                      <img src={icon} alt={year.name} className="h-14 w-14 rounded-lg object-contain flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                        {year.name}
                      </h2>
                      {year.subtitle && (
                        <p className="text-sm text-muted-foreground mt-0.5">{year.subtitle}</p>
                      )}
                      {isPreferred && (
                        <span className="text-[11px] font-medium text-primary mt-1 inline-block">
                          Your current year
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
