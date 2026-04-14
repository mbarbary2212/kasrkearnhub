import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export function AccountTab() {
  const { user } = useAuthContext();

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
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user?.email ?? '—'}</p>
          </div>
          <p className="text-sm text-muted-foreground">More account settings coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
