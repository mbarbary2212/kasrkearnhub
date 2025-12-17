import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Stethoscope, FlaskConical, Users, Award } from 'lucide-react';

const years = [
  { year: 1, title: 'Year 1', subtitle: 'Foundation', icon: BookOpen, color: 'bg-medical-blue' },
  { year: 2, title: 'Year 2', subtitle: 'Pre-Clinical', icon: FlaskConical, color: 'bg-medical-teal' },
  { year: 3, title: 'Year 3', subtitle: 'Clinical I', icon: Stethoscope, color: 'bg-medical-green' },
  { year: 4, title: 'Year 4', subtitle: 'Clinical II', icon: Users, color: 'bg-medical-orange' },
  { year: 5, title: 'Year 5', subtitle: 'Final Year', icon: Award, color: 'bg-medical-purple' },
];

export default function Home() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { data: departments } = useDepartments();

  const totalDepartments = departments?.length || 0;

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Hero Section */}
        <section className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm text-secondary-foreground mb-6">
            <GraduationCap className="w-4 h-4" />
            <span>Medical Education Platform</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
            Welcome to <span className="text-gradient-medical">KasrLearn</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Your comprehensive medical education platform. Browse courses by academic year, 
            access video lectures, take quizzes, and study clinical cases.
          </p>
          {!user && (
            <Button onClick={() => navigate('/auth')} size="lg" className="gradient-medical">
              Get Started
            </Button>
          )}
        </section>

        {/* Year Selection */}
        <section>
          <h2 className="text-2xl font-heading font-semibold mb-6 text-center">
            Select Your Academic Year
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {years.map(({ year, title, subtitle, icon: Icon, color }) => (
              <Card
                key={year}
                className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group border-0 shadow-md"
                onClick={() => navigate(`/year/${year}`)}
              >
                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="font-heading">{title}</CardTitle>
                  <CardDescription>{subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Explore departments and topics
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        {user && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDepartments}</p>
                    <p className="text-sm text-muted-foreground">Departments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">100+</p>
                    <p className="text-sm text-muted-foreground">Topics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">Years</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
