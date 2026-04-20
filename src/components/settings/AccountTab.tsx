import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, KeyRound, BookOpenCheck, Sparkles, PlayCircle } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function AccountTab() {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => setResetCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      toast.success('Check your inbox for a reset link');
      setResetCooldown(60);
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  const handleReplayTour = () => {
    // Clear "seen" flag so the tour will run again
    try { localStorage.removeItem('kalm_tour_student_done'); } catch {}
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for Home to mount and register its listener
      setTimeout(() => window.dispatchEvent(new CustomEvent('kalm:start-tour')), 400);
    } else {
      window.dispatchEvent(new CustomEvent('kalm:start-tour'));
    }
  };

  const handleOpenGuide = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => window.dispatchEvent(new CustomEvent('kalm:open-workflow')), 400);
    } else {
      window.dispatchEvent(new CustomEvent('kalm:open-workflow'));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Full name</p>
            <p className="text-sm font-medium">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user?.email ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Password
          </CardTitle>
          <CardDescription>Reset your password via email</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={resetCooldown > 0 || !user?.email}
          >
            <Mail className="w-4 h-4 mr-2" />
            {resetCooldown > 0 ? `Sent — wait ${resetCooldown}s` : 'Send Password Reset Email'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Help & Tour
          </CardTitle>
          <CardDescription>Replay the guided tour or open the how-to guide</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReplayTour}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Replay tour
          </Button>
          <Button variant="outline" onClick={handleOpenGuide}>
            <BookOpenCheck className="w-4 h-4 mr-2" />
            Open how-to guide
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
