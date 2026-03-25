import { AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface BlockedUserScreenProps {
  message: string;
}

export function BlockedUserScreen({ message }: BlockedUserScreenProps) {
  const handleSignOut = async () => {
    sessionStorage.removeItem('kalmhub:hasVisitedHome');
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@example.com?subject=Account%20Support%20Request';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Account Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            {message}
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleContactSupport}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            If you believe this is an error, please reach out to our support team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
