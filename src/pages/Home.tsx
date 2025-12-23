import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Users, BookOpen, Stethoscope, Settings, ChevronRight } from 'lucide-react';
import { useYears } from '@/hooks/useYears';
import logo from '@/assets/logo.png';

export default function Home() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // If user is logged in, show the year selection page
  if (user) {
    return <LoggedInHome />;
  }

  // Landing page for non-logged in users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        
        <div className="container mx-auto px-4 py-16 relative z-10">
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center gap-3 mb-6">
              <img src={logo} alt="KasrLearn Logo" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">
              <span className="text-gradient-medical">KasrLearn</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your comprehensive medical education platform for Kasr Al-Ainy Faculty of Medicine
            </p>
          </div>

          {/* Login Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Student Login - Primary, prominent on all devices */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg group"
              onClick={() => navigate('/auth?type=student')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-medical-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-heading">Student</CardTitle>
                <CardDescription className="text-base">
                  Access lectures, quizzes, and study materials
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full gradient-medical text-lg py-6">
                  Student Login
                </Button>
              </CardContent>
            </Card>

            {/* Faculty & Staff Login - Only visible on desktop/tablet (md and up) */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg group hidden md:block"
              onClick={() => navigate('/auth?type=faculty')}
            >
              <CardHeader className="text-center pb-4">
                <div className="w-20 h-20 bg-medical-teal rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-10 h-10 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl font-heading">Faculty & Staff</CardTitle>
                <CardDescription className="text-base">
                  Manage content, view analytics, and track progress
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full bg-medical-teal hover:bg-medical-teal/90 text-primary-foreground text-lg py-6">
                  Faculty Login
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Mobile-only Faculty Login - Secondary/Less prominent */}
          <div className="md:hidden mt-6 text-center">
            <Button 
              variant="outline" 
              size="sm"
              className="text-muted-foreground"
              onClick={() => navigate('/auth?type=faculty')}
            >
              <Users className="w-4 h-4 mr-2" />
              Faculty & Staff Login
            </Button>
          </div>

          {/* Features Section */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Video Lectures</h3>
              <p className="text-sm text-muted-foreground">
                High-quality video content for all subjects
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                <Stethoscope className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-2">Clinical Cases</h3>
              <p className="text-sm text-muted-foreground">
                Real-world clinical scenarios and practice
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-2">MCQs & Essays</h3>
              <p className="text-sm text-muted-foreground">
                Test your knowledge with quizzes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Logged in user home page
function LoggedInHome() {
  const navigate = useNavigate();
  const { profile, role } = useAuthContext();
  const { data: years, isLoading } = useYears();

  const isAdmin = role === 'admin' || role === 'department_admin' || role === 'platform_admin' || role === 'super_admin';

  // Color mapping for years - using inline styles since dynamic Tailwind classes are purged
  const getYearStyle = (color: string | null): React.CSSProperties => {
    const colorMap: Record<string, string> = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#22c55e',
      'bg-yellow-500': '#eab308',
      'bg-orange-500': '#f97316',
      'bg-red-500': '#ef4444',
      'bg-purple-500': '#a855f7',
      'bg-pink-500': '#ec4899',
      'bg-teal-500': '#14b8a6',
      'bg-indigo-500': '#6366f1',
      'bg-primary': 'hsl(var(--primary))',
    };
    const bgColor = color && colorMap[color] ? colorMap[color] : 'hsl(var(--primary))';
    return { backgroundColor: bgColor };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="KasrLearn Logo" className="w-10 h-10 object-contain" />
            <span className="font-heading font-bold text-xl">KasrLearn</span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button variant="ghost" onClick={() => navigate('/admin')}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/auth')}>
              {profile?.full_name || 'Account'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Welcome Section */}
          <section className="text-center py-8">
            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Welcome back, <span className="text-gradient-medical">{profile?.full_name || 'Student'}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Select your academic year to continue
            </p>
          </section>

          {/* Year Selection */}
          <section className="max-w-3xl mx-auto">
            <h2 className="text-xl font-heading font-semibold mb-4">Academic Years</h2>
            
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full" />
                ))}
              </div>
            ) : years && years.length > 0 ? (
              <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                {years.map((year) => (
                  <div
                    key={year.id}
                    className="flex items-center gap-4 py-4 px-4 cursor-pointer transition-colors hover:bg-muted/50 group"
                    onClick={() => navigate(`/year/${year.number}`)}
                  >
                    <div 
                      className="flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
                      style={getYearStyle(year.color)}
                    >
                      <span className="text-lg font-semibold text-primary-foreground">{year.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-foreground">
                        {year.name}
                      </p>
                      {year.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">{year.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No years available yet.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
