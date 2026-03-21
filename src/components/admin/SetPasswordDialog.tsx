import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, EyeOff, RefreshCw, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasswordRequirements, isPasswordValid } from '@/components/auth/PasswordRequirements';

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; email: string; full_name: string | null } | null;
}

function generatePassword(length = 12): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

export function SetPasswordDialog({ open, onOpenChange, user }: SetPasswordDialogProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultCredentials, setResultCredentials] = useState<{ email: string; password: string } | null>(null);

  const handleGenerate = () => {
    const pw = generatePassword();
    setGeneratedPassword(pw);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setMode('auto');
      setPassword('');
      setGeneratedPassword('');
      setShowPassword(false);
      setResultCredentials(null);
      handleGenerate();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const finalPassword = mode === 'auto' ? generatedPassword : password;
    
    if (!isPasswordValid(finalPassword)) {
      toast.error('Password must be 8–64 chars with lowercase, uppercase, number, and symbol');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-user', {
        body: {
          action: 'set-password',
          user: { email: user.email, password: finalPassword },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to set password');

      setResultCredentials({ email: user.email, password: finalPassword });
      toast.success('Password set successfully');
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error(error.message || 'Failed to set password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const copyAll = () => {
    if (!resultCredentials) return;
    const text = `Email: ${resultCredentials.email}\nTemporary Password: ${resultCredentials.password}\n\nPlease sign in and change your password from the avatar menu → Account.`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Set Temporary Password
          </DialogTitle>
          <DialogDescription>
            Set a password for <strong>{user?.full_name || user?.email}</strong>. Share the credentials and ask them to change it from Account settings.
          </DialogDescription>
        </DialogHeader>

        {resultCredentials ? (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm bg-background px-2 py-1 rounded border">{resultCredentials.email}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(resultCredentials.email, 'Email')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm bg-background px-2 py-1 rounded border font-mono">{resultCredentials.password}</code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(resultCredentials.password, 'Password')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={copyAll} className="w-full">
              <Copy className="h-4 w-4 mr-2" /> Copy All Credentials
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Remind the user to change their password from the avatar dropdown → Account page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('auto'); if (!generatedPassword) handleGenerate(); }}
                className="flex-1"
              >
                Auto-Generate
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('manual')}
                className="flex-1"
              >
                Enter Manually
              </Button>
            </div>

            {mode === 'auto' ? (
              <div className="space-y-2">
                <Label>Generated Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={generatedPassword}
                    readOnly
                    type={showPassword ? 'text' : 'password'}
                    className="font-mono"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleGenerate} title="Regenerate">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password (min 8 characters)"
                    className="font-mono"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <PasswordRequirements password={password} mode="live" />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (mode === 'manual' && !isPasswordValid(password)) || (mode === 'auto' && !generatedPassword)}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Set Password
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
