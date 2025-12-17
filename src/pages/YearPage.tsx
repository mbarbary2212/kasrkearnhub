import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDepartmentsByYear } from '@/data/mockData';
import { ArrowLeft, Bone, Heart, FlaskConical, Microscope, Pill, Bug, Stethoscope, Scissors, Baby } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bone,
  Heart,
  FlaskConical,
  Microscope,
  Pill,
  Bug,
  Stethoscope,
  Scissors,
  Baby,
};

const categoryColors = {
  basic: 'border-l-medical-blue',
  clinical: 'border-l-medical-teal',
};

export default function YearPage() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const year = parseInt(yearId || '1');
  const departments = getDepartmentsByYear(year);

  const basicSciences = departments.filter(d => d.category === 'basic');
  const clinicalDepts = departments.filter(d => d.category === 'clinical');

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Year {year}</h1>
            <p className="text-muted-foreground">Select a department to explore topics</p>
          </div>
        </div>

        {/* Basic Sciences */}
        {basicSciences.length > 0 && (
          <section>
            <h2 className="text-xl font-heading font-semibold mb-4 text-medical-blue">
              Basic Sciences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {basicSciences.map((dept) => {
                const Icon = iconMap[dept.icon] || FlaskConical;
                return (
                  <Card
                    key={dept.id}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 ${categoryColors.basic}`}
                    onClick={() => navigate(`/department/${dept.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-heading">{dept.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{dept.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Clinical Departments */}
        {clinicalDepts.length > 0 && (
          <section>
            <h2 className="text-xl font-heading font-semibold mb-4 text-medical-teal">
              Clinical Departments
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinicalDepts.map((dept) => {
                const Icon = iconMap[dept.icon] || Stethoscope;
                return (
                  <Card
                    key={dept.id}
                    className={`cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-l-4 ${categoryColors.clinical}`}
                    onClick={() => navigate(`/department/${dept.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-heading">{dept.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{dept.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {departments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No departments available for this year.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
