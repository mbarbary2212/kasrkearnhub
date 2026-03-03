import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock, ArrowLeft, Loader2, ChevronDown, CheckCircle, KeyRound, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { AccessRequestForm } from '@/components/auth/AccessRequestForm';
import logo from '@/assets/kalm-logo-icon.png';

export default function Auth() {
  const { isSuperAdmin } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'reset' | 'change-password' | 'request-access'>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Login form state (controlled inputs for autofill support)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);

  // Inline forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Password reset form state
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Auth error from hash fragment (e.g., expired tokens)
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  
  const viewParam = searchParams.get('view');

  // Sign in function
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    return { error };
  };

  // Password reset request function
  const sendPasswordResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/auth?view=change-password`,
    });
    return { error };
  };

  // Update password function
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  // Sign out function
  const signOut = async () => {
    // Clear stored last path on logout
    try {
      localStorage.removeItem('kalmhub:lastPath');
    } catch {
      // Ignore storage errors
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    // Check if view parameter is set
    if (viewParam === 'change-password') {
      setAuthView('change-password');
    }

    // Parse hash fragment for auth errors (e.g., expired tokens from email links)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    const errorCode = hashParams.get('error_code');
    
    if (errorDescription) {
      if (errorCode === 'otp_expired') {
        setAuthErrorMessage('This link has expired. Please request a new password reset link below.');
      } else {
        setAuthErrorMessage(errorDescription.replace(/\+/g, ' '));
      }
      // Show the login view with the error, not the change-password view
      setAuthView('login');
      setShowForgotPassword(true);
    }
    
    // Check current session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setAuthLoading(false);
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      
      // When user clicks password reset/invite link, Supabase fires PASSWORD_RECOVERY
      // Automatically show password change form
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('change-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [viewParam]);

  // Auto-submit trigger
  const triggerAutoSubmit = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    setAutoSubmitPending(true);
    autoSubmitTimeoutRef.current = setTimeout(() => {
      if (formRef.current && !isLoading) {
        formRef.current.requestSubmit();
      }
      setAutoSubmitPending(false);
    }, 600);
  }, [isLoading]);

  // Cancel auto-submit if user interacts
  const cancelAutoSubmit = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      setAutoSubmitPending(false);
    }
  }, []);

  // Handle password change - detect autofill
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginPassword(value);
    
    if (value.length >= 8 && loginEmail.length > 3) {
      triggerAutoSubmit();
    }
  }, [loginEmail, triggerAutoSubmit]);

  // Handle email change
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    
    if (loginPassword.length >= 8 && value.length > 3) {
      triggerAutoSubmit();
    }
  }, [loginPassword, triggerAutoSubmit]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    cancelAutoSubmit();
    setIsLoading(true);
    
    const email = loginEmail || (new FormData(e.currentTarget).get('email') as string);
    const password = loginPassword || (new FormData(e.currentTarget).get('password') as string);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Failed to sign in');
    } else {
      // Check for stored lastPath to resume session
      // Home.tsx will handle the redirect logic with proper role validation
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleInlineForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setForgotLoading(true);
    const { error } = await sendPasswordResetEmail(forgotEmail);
    
    if (error) {
      // Show generic message for security
      console.error('Password reset error:', error);
    }
    
    // Always show success for security (don't reveal if email exists)
    setForgotSuccess(true);
    setForgotLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (resetPassword !== resetConfirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (resetPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (resetPassword.length > 64) {
      toast.error('Password must be 64 characters or less');
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(resetPassword);
    if (error) {
      toast.error(error.message || 'Failed to set password');
    } else {
      toast.success('Password set successfully!');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Show access request form
  if (authView === 'request-access') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        <div className="w-full max-w-md relative z-10">
          <AccessRequestForm 
            onBack={() => setAuthView('login')} 
            defaultType="student"
          />
        </div>
      </div>
    );
  }

  // Show password reset form if in reset mode
  if (authView === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        
        <div className="w-full max-w-md relative z-10">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => {
              setAuthView('login');
              navigate('/auth');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-heading font-bold flex items-center justify-center gap-2">
                <img src={logo} alt="KALM Hub" className="h-8 w-8 object-contain" />
                Set New Password
              </CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={8}
                      maxLength={64}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>
                  <PasswordRequirements password={resetPassword} mode="live" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={8}
                      maxLength={64}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-medical"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show change password form for logged-in users
  if (authView === 'change-password' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        
        <div className="w-full max-w-md relative z-10">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-heading font-bold flex items-center justify-center gap-2">
                <img src={logo} alt="KALM Hub" className="h-8 w-8 object-contain" />
                Set Your Password
              </CardTitle>
              <CardDescription>Create a secure password for your account</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="change-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="change-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={8}
                      maxLength={64}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                    />
                  </div>
                  <PasswordRequirements password={resetPassword} mode="live" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-change-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-change-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={8}
                      maxLength={64}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full gradient-medical"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show account management if already logged in
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <img src={logo} alt="KALM Hub" className="h-8 w-8 object-contain" />
              You're signed in
            </CardTitle>
            <CardDescription>What would you like to do?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setAuthView('change-password')}>
              <KeyRound className="mr-2 h-4 w-4" />
              Set Password
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 gradient-medical opacity-5" />
      
      <div className="w-full max-w-md relative z-10">

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-heading font-bold flex items-center justify-center gap-2">
              <img src={logo} alt="KALM Hub" className="h-8 w-8 object-contain" />
              Welcome
            </CardTitle>
            <CardDescription>Sign in to access KALM Hub</CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Auth error alert (e.g., expired link) */}
            {authErrorMessage && (
              <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-medium">Link Expired</p>
                <p>{authErrorMessage}</p>
              </div>
            )}

            {/* Login Form - No tabs, just the form */}
            <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    required
                    value={loginEmail}
                    onChange={handleEmailChange}
                    onFocus={cancelAutoSubmit}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    minLength={8}
                    value={loginPassword}
                    onChange={handlePasswordChange}
                    onFocus={cancelAutoSubmit}
                  />
                </div>
                <PasswordRequirements mode="static" />
              </div>
              
              {autoSubmitPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Signing in...</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full gradient-medical"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Inline Forgot Password */}
            <Collapsible 
              open={showForgotPassword} 
              onOpenChange={(open) => {
                setShowForgotPassword(open);
                if (!open) {
                  setForgotSuccess(false);
                  setForgotEmail('');
                }
              }}
              className="mt-4"
            >
              <CollapsibleTrigger className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary w-full py-2 transition-colors">
                <ChevronDown className={cn("h-4 w-4 transition-transform", showForgotPassword && "rotate-180")} />
                Forgot your password?
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 pt-4 border-t">
                {forgotSuccess ? (
                  <div className="text-center py-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If this email is registered, you will receive a reset link shortly.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleInlineForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="your@email.com"
                          className="pl-10"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      variant="outline"
                      className="w-full"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Request Access Link */}
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Don't have an account?
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setAuthView('request-access')}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Request Access
              </Button>
            </div>

            {/* Sentry Test Button – remove after verifying */}
            <div className="mt-4 pt-4 border-t text-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { throw new Error("SENTRY_PRODUCTION_TEST"); }}
              >
                Sentry Test
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
