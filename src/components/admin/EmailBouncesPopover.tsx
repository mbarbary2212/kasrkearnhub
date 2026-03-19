import { format } from 'date-fns';
import { AlertTriangle, XCircle, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmailBounces, EmailEvent } from '@/hooks/useEmailBounces';

export function EmailBouncesPopover() {
  const { data: bounces, isLoading } = useEmailBounces();
  
  // Get unique emails with their latest bounce event
  const uniqueBounces = bounces?.reduce((acc: EmailEvent[], event) => {
    if (!acc.find(e => e.to_email === event.to_email)) {
      acc.push(event);
    }
    return acc;
  }, []) || [];

  const bounceCount = uniqueBounces.length;

  if (bounceCount === 0 && !isLoading) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {bounceCount} Bounced
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h4 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Email Delivery Issues
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            These email addresses had delivery problems
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          <div className="p-2 space-y-2">
            {uniqueBounces.map((event) => (
              <div 
                key={event.id} 
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {event.to_email}
                    </span>
                  </div>
                  <Badge 
                    variant="destructive" 
                    className="shrink-0 text-xs"
                  >
                    {event.event_type === 'email.bounced' ? (
                      <><XCircle className="h-3 w-3 mr-1" /> Bounced</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Spam</>
                    )}
                  </Badge>
                </div>
                {event.reason && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {event.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        {bounceCount > 0 && (
          <div className="p-3 border-t bg-muted/50">
            <p className="text-xs text-muted-foreground">
              Consider verifying these email addresses before resending invitations.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
