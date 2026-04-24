import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/useEmailPreferences';

export function NotificationsSection() {
  const { data: prefs, isLoading } = useEmailPreferences();
  const updatePrefs = useUpdateEmailPreferences();

  const handleToggle = (key: string, checked: boolean) => {
    updatePrefs.mutate(
      { [key]: checked },
      {
        onSuccess: () => toast.success('Email preference updated'),
        onError: () => toast.error('Failed to update preference'),
      }
    );
  };

  const toggleItems = [
    { key: 'notify_access_requests', label: 'Access Requests', description: 'When a new user requests access to the platform' },
    { key: 'notify_new_feedback', label: 'Feedback Received', description: 'When a student submits feedback on content' },
    { key: 'notify_new_inquiries', label: 'Student Inquiries', description: 'When a student submits a new inquiry' },
    { key: 'notify_ticket_assigned', label: 'Ticket Assigned to You', description: 'When a support ticket is assigned to you' },
    { key: 'notify_new_content', label: 'New Content Uploads', description: 'When other admins create or modify content (can be noisy)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="w-5 h-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>Choose which events send you an email alert.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor={item.key} className="text-base font-medium">
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={prefs ? ((prefs as unknown as Record<string, unknown>)[item.key] as boolean) : false}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                disabled={updatePrefs.isPending}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}