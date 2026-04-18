import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthContext } from '@/contexts/AuthContext';
import { useYears } from '@/hooks/useYears';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Camera, Key, Home, User, Loader2, Shield, AlertTriangle, Trash2, CheckCircle2, Save, ChevronDown, PlayCircle } from 'lucide-react';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { useTour } from '@/hooks/useTour';
import { studentTourSteps } from '@/components/tour/studentTourSteps';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageCropper } from '@/components/account/ImageCropper';
import { PasswordRequirements, isPasswordValid } from '@/components/auth/PasswordRequirements';
import { useAdminApiKeyStatus, useSaveAdminApiKey, useRevokeAdminApiKey, useAIPlatformSettings } from '@/hooks/useAIGovernance';

export default function AccountPage() {
  const { user, profile, isLoading: authLoading, patchProfile } = useAuthContext();
  const navigate = useNavigate();
  const { data: years, isLoading: yearsLoading } = useYears();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { startTour, resetTour } = useTour('student', studentTourSteps);

  const handleReplayTutorial = () => {
    resetTour();
    // Navigate home so the tour targets exist on the page, then start
    if (window.location.pathname !== '/') {
      navigate('/');
      setTimeout(() => startTour(), 400);
    } else {
      startTour();
    }
    toast.success('Tutorial restarted');
  };
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [preferredYearId, setPreferredYearId] = useState<string>('');
  const [autoLoginToYear, setAutoLoginToYear] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initialize form values from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || null);
      
      // Fetch extended profile data
      const fetchExtendedProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_year_id, auto_login_to_year')
          .eq('id', profile.id)
          .single();
        
        if (data) {
          setPreferredYearId(data.preferred_year_id || '');
          setAutoLoginToYear(data.auto_login_to_year || false);
        }
      };
      fetchExtendedProfile();
    }
  }, [profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropperOpen(true);
    
    // Reset input
    event.target.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setIsUploadingAvatar(true);

    try {
      if (!user) throw new Error('Not authenticated');

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const updates = {
        full_name: fullName.trim() || null,
        preferred_year_id: preferredYearId || null,
        auto_login_to_year: autoLoginToYear,
      };

      // Update + return the persisted row so we can verify
      const { data: updatedRows, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id, full_name, preferred_year_id, auto_login_to_year');

      if (error) {
        // Surface the Supabase error verbatim (code + message + hint)
        console.error('[AccountPage] Supabase update error:', error);
        const verbatim = [error.message, error.details, error.hint, error.code]
          .filter(Boolean)
          .join(' • ');
        toast.error(verbatim || 'Unknown Supabase error');
        return;
      }

      // Refetch authoritative row to verify the write actually persisted
      const { data: verifyRow, error: verifyError } = await supabase
        .from('profiles')
        .select('preferred_year_id, auto_login_to_year, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (verifyError) {
        console.error('[AccountPage] Verify fetch error:', verifyError);
        toast.error(verifyError.message || 'Saved but could not verify');
        return;
      }

      const persistedYear = verifyRow?.preferred_year_id ?? null;
      const expectedYear = updates.preferred_year_id;
      if (persistedYear !== expectedYear) {
        console.error('[AccountPage] preferred_year_id mismatch', {
          expected: expectedYear,
          persisted: persistedYear,
          updatedRows,
          verifyRow,
        });
        toast.error('Save did not persist — please contact support');
        return;
      }

      // Optimistically update local auth state
      patchProfile(updates as any);

      // Sync local form state with verified server values
      setPreferredYearId(verifyRow?.preferred_year_id || '');
      setAutoLoginToYear(verifyRow?.auto_login_to_year || false);
      setFullName(verifyRow?.full_name || '');

      toast.success('Profile saved successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid(newPassword)) {
      toast.error('Password must be 8–64 characters and include a lowercase letter, uppercase letter, number, and symbol');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <User className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Account Settings</h1>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Picture</CardTitle>
            <CardDescription>
              Click on the avatar to upload a new photo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative group">
              <Avatar 
                className="h-24 w-24 cursor-pointer ring-2 ring-border hover:ring-primary transition-all"
                onClick={handleAvatarClick}
              >
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl gradient-medical text-primary-foreground">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={handleAvatarClick}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div>
              <p className="font-medium">{fullName || user?.email}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferredYear">Preferred Year</Label>
                <Select value={preferredYearId} onValueChange={setPreferredYearId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years?.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        Year {year.number} - {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This year will be your default when logging in
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="autoLogin" className="text-base">
                    Auto-login to this year
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Skip the landing page and go directly to your preferred year
                  </p>
                </div>
                <Switch
                  id="autoLogin"
                  checked={autoLoginToYear}
                  onCheckedChange={setAutoLoginToYear}
                  disabled={!preferredYearId}
                />
              </div>

              {autoLoginToYear && preferredYearId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tip: You can always return to the main page by clicking "Home" in the menu
                  </p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
                maxLength={64}
              />
              <PasswordRequirements password={newPassword} mode="live" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={8}
                maxLength={64}
              />
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              variant="outline"
              className="w-full"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Admin API Key (BYOK) */}
        <AdminApiKeyCard />

        {/* Help & Tutorial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Help & Tutorial
            </CardTitle>
            <CardDescription>
              Replay the guided walkthrough of the dashboard if you skipped it or want a refresher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleReplayTutorial}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Replay tutorial
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Modal */}
      {selectedImage && (
        <ImageCropper
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            if (selectedImage) {
              URL.revokeObjectURL(selectedImage);
              setSelectedImage(null);
            }
          }}
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}
    </MainLayout>
  );
}

// ============================================
// Admin API Key (BYOK) Card
// ============================================

function AdminApiKeyCard() {
  const { isAdmin, isPlatformAdmin, isSuperAdmin, isDepartmentAdmin } = useAuthContext();
  const isAdminRole = isAdmin || isPlatformAdmin || isSuperAdmin || isDepartmentAdmin;
  const { data: keyStatus, isLoading } = useAdminApiKeyStatus(isAdminRole);
  const { data: platformSettings } = useAIPlatformSettings();
  const saveKey = useSaveAdminApiKey();
  const revokeKey = useRevokeAdminApiKey();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showInput, setShowInput] = useState(false);

  if (!isAdminRole) return null;

  const needsKey = !keyStatus?.has_key && !platformSettings?.allow_admin_fallback_to_global_key && !isSuperAdmin;

  const handleSave = async () => {
    if (!apiKeyInput || apiKeyInput.length < 10) {
      toast.error('Please enter a valid API key');
      return;
    }
    await saveKey.mutateAsync({ api_key: apiKeyInput });
    setApiKeyInput('');
    setShowInput(false);
  };

  return (
    <>
      {needsKey && (
        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Please add your own API key to generate AI content.</p>
            {platformSettings?.global_key_disabled_message && (
              <Collapsible>
                <CollapsibleTrigger className="text-sm underline cursor-pointer hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1">
                  Read setup guide
                  <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="prose prose-sm dark:prose-invert prose-amber max-w-none [&_a]:text-amber-700 dark:[&_a]:text-amber-300">
                    <SafeMarkdown>{platformSettings.global_key_disabled_message}</SafeMarkdown>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            My AI API Key
          </CardTitle>
          <CardDescription>
            Add your own Google Gemini API key for AI content generation. Your key is encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : keyStatus?.has_key ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">API Key Active</p>
                  <p className="text-xs text-muted-foreground">
                    Provider: {keyStatus.provider} · Hint: ****{keyStatus.key_hint}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInput(true)}>
                  Replace Key
                </Button>
                <Button variant="destructive" size="sm" onClick={() => revokeKey.mutate()} disabled={revokeKey.isPending}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowInput(true)}>
              Add My API Key
            </Button>
          )}

          {showInput && (
            <div className="space-y-3 p-4 border rounded-lg">
              <Label>Google Gemini API Key</Label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIza..."
              />
              <p className="text-xs text-muted-foreground">
                Get your key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saveKey.isPending || !apiKeyInput}>
                  {saveKey.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save Key
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowInput(false); setApiKeyInput(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
