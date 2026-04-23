import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { SentryDiagnosticsSection } from '@/components/admin/SentryDiagnosticsSection';

export function DiagnosticsSection() {
  const { isSuperAdmin } = useAuthContext();
  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
          <CardDescription>Super admin access required.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <SentryDiagnosticsSection />
    </div>
  );
}