import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, User, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

type AuthView = 'login' | 'forgot' | 'reset' | 'change-password';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const loginType = searchParams.get('type') || 'student';
  const mode = searchParams.get('mode');
  const view = searchParams.get('view');
  const [isLoading, setIsLoading] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { signIn, signUp, signOut, resetPassword, updatePassword, user, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a password reset callback
    if (mode === 'reset') {
      setAuthView('reset');
    } else if (view === 'password' && user) {
      setAuthView('change-password');
    }
  }, [mode, view, user]);

  // Cleanup auto-submit timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, []);

  // Auto-submit when both fields are filled (triggered by biometric autofill)
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
    }, 600); // 600ms delay to allow user to cancel
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
    
    // Check if this looks like autofill (password filled rapidly while email exists)
    // Autofill typically fills both fields at once
    if (value.length >= 6 && loginEmail.length > 3) {
      triggerAutoSubmit();
    }
  }, [loginEmail, triggerAutoSubmit]);

  // Handle email change
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginEmail(value);
    
    // If password already filled and email is being autofilled
    if (loginPassword.length >= 6 && value.length > 3) {
      triggerAutoSubmit();
    }
  }, [loginPassword, triggerAutoSubmit]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    cancelAutoSubmit();
    setIsLoading(true);
    
    // Use state values instead of form data for controlled inputs
    const email = loginEmail || (new FormData(e.currentTarget).get('email') as string);
    const password = loginPassword || (new FormData(e.currentTarget).get('password') as string);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || 'Failed to sign in');
    } else {
      navigate('/');
    }
    setIsLoading(false);
  };

  // Accepts @kasralainy.edu.eg and any subdomain like @students.kasralainy.edu.eg
  const isAllowedEmailDomain = (email: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    // Match exact domain or any subdomain
    return normalizedEmail.endsWith('@kasralainy.edu.eg') || 
           normalizedEmail.includes('@') && normalizedEmail.split('@')[1]?.endsWith('.kasralainy.edu.eg');
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).toLowerCase().trim();
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;

    // Validate email domain for new sign-ups
    if (!isAllowedEmailDomain(email)) {
      toast.error('Registration is currently limited to Kasr Al-Ainy accounts (@kasralainy.edu.eg or subdomains).');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, name);
    if (error) {
      toast.error(error.message || 'Failed to sign up');
    } else {
      toast.success('Account created! Please check your email to confirm.');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const { error } = await resetPassword(email);
    if (error) {
      toast.error(error.message || 'Failed to send reset email');
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setAuthView('login');
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(password);
    if (error) {
      toast.error(error.message || 'Failed to reset password');
    } else {
      toast.success('Password updated successfully!');
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
              <img src={logo} alt="KasrLearn Logo" className="mx-auto w-16 h-16 object-contain mb-4" />
              <CardTitle className="text-2xl font-heading font-bold">Set New Password</CardTitle>
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
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
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

  // Show forgot password form
  if (authView === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 gradient-medical opacity-5" />
        
        <div className="w-full max-w-md relative z-10">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setAuthView('login')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <img src={logo} alt="KasrLearn Logo" className="mx-auto w-16 h-16 object-contain mb-4" />
              <CardTitle className="text-2xl font-heading font-bold">Forgot Password?</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      required
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
                      Sending reset link...
                    </>
                  ) : (
                    'Send Reset Link'
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
              <img src={logo} alt="KasrLearn Logo" className="mx-auto w-16 h-16 object-contain mb-4" />
              <CardTitle className="text-2xl font-heading font-bold">Change Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="change-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="change-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-change-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-change-password"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      minLength={6}
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
            <img src={logo} alt="KasrLearn Logo" className="mx-auto w-16 h-16 object-contain mb-4" />
            <CardTitle>You're signed in</CardTitle>
            <CardDescription>What would you like to do?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setAuthView('change-password')}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isStudent = loginType === 'student';
  const title = isStudent ? 'Student Portal' : 'Faculty & Staff Portal';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 gradient-medical opacity-5" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
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
            <img src={logo} alt="KasrLearn Logo" className="mx-auto w-16 h-16 object-contain mb-4" />
            <CardTitle className="text-2xl font-heading font-bold">{title}</CardTitle>
            <CardDescription>Sign in to access KasrLearn</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setAuthView('forgot')}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        required
                        value={loginPassword}
                        onChange={handlePasswordChange}
                        onFocus={cancelAutoSubmit}
                      />
                    </div>
                  </div>
                  
                  {autoSubmitPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className={`w-full ${isStudent ? 'gradient-medical' : 'bg-medical-teal hover:bg-medical-teal/90'}`}
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
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        name="name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@kasralainy.edu.eg"
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      New registrations are limited to Kasr Al-Ainy accounts (e.g. @kasralainy.edu.eg, @students.kasralainy.edu.eg).
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className={`w-full ${isStudent ? 'gradient-medical' : 'bg-medical-teal hover:bg-medical-teal/90'}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Switch login type */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isStudent ? 'Are you a faculty member?' : 'Are you a student?'}
              </p>
              <Button 
                variant="link" 
                className="text-primary"
                onClick={() => navigate(`/auth?type=${isStudent ? 'faculty' : 'student'}`)}
              >
                {isStudent ? 'Faculty & Staff Login' : 'Student Login'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
