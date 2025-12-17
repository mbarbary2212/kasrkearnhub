import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, BookOpen, Stethoscope } from 'lucide-react';
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
            {/* Student Login */}
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

            {/* Faculty & Staff Login */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 border-0 shadow-lg group"
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

  const years = [
    { year: 1, title: 'Year 1', subtitle: 'Foundation', color: 'bg-medical-blue' },
    { year: 2, title: 'Year 2', subtitle: 'Pre-Clinical', color: 'bg-medical-teal' },
    { year: 3, title: 'Year 3', subtitle: 'Clinical I', color: 'bg-medical-green' },
    { year: 4, title: 'Year 4', subtitle: 'Clinical II', color: 'bg-medical-orange' },
    { year: 5, title: 'Year 5', subtitle: 'Final Year', color: 'bg-medical-purple' },
  ];

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
            {role === 'admin' && (
              <Button variant="ghost" onClick={() => navigate('/admin')}>
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
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {years.map(({ year, title, subtitle, color }) => (
                <Card
                  key={year}
                  className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group border-0 shadow-md"
                  onClick={() => navigate(`/year/${year}`)}
                >
                  <CardHeader className="pb-2">
                    <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <span className="text-2xl font-bold text-primary-foreground">{year}</span>
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
        </div>
      </main>
    </div>
  );
}
