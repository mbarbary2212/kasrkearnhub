import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAdminOverviewStats } from '@/hooks/useAdminOverviewStats';
import { useAuthContext } from '@/contexts/AuthContext';
import { AdminModuleBrowser } from '@/components/admin/AdminModuleBrowser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle, MessageCircle, ThumbsUp, ThumbsDown,
  Plus, Upload, FileQuestion, Inbox, Flag,
  Clock, BarChart3, Shield, Activity,
  HelpCircle, MessageSquare, ChevronDown,
  Zap, Heart,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();
  const { data: stats, isLoading } = useAdminOverviewStats();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin';

  if (isLoading || !stats) {
    return (
      <MainLayout>
        <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
          <Skeleton className="h-8 w-64" />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[3] space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="flex-[2] space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const attentionCount =
    (stats.unansweredOver48h > 0 ? 1 : 0) +
    (stats.unansweredOver24h > 0 ? 1 : 0) +
    (stats.pendingFeedback > 0 ? 1 : 0) +
    (stats.highPriorityCount > 0 ? 1 : 0) +
    (stats.needsReviewCount > 0 ? 1 : 0) +
    (stats.itemsNeedingReview > 0 ? 1 : 0);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
        <h1 className="text-xl md:text-2xl font-heading font-bold">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>

        {/* 60/40 Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Module Browser (60%) */}
          <div className="flex-[3] min-w-0">
            <AdminModuleBrowser />
          </div>

          {/* Right: Admin Intelligence (40%) */}
          <div className="flex-[2] min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Alerts */}
            <AccordionSection
              icon={AlertTriangle}
              title="Alerts"
              badge={attentionCount > 0 ? attentionCount : undefined}
              badgeVariant="destructive"
              defaultOpen={attentionCount > 0}
            >
              <div className="space-y-2">
                {stats.unansweredOver48h > 0 && (
                  <AlertRow icon={Clock} label="Unanswered >48h" count={stats.unansweredOver48h} variant="destructive" onClick={() => navigate('/admin/inbox?urgency=overdue')} />
                )}
                {stats.unansweredOver24h > 0 && stats.unansweredOver24h !== stats.unansweredOver48h && (
                  <AlertRow icon={Clock} label="Unanswered >24h" count={stats.unansweredOver24h} variant="warning" onClick={() => navigate('/admin/inbox?urgency=attention')} />
                )}
                {stats.pendingFeedback > 0 && (
                  <AlertRow icon={MessageSquare} label="Pending feedback" count={stats.pendingFeedback} variant="warning" onClick={() => navigate('/admin?tab=analytics')} />
                )}
                {stats.highPriorityCount > 0 && (
                  <AlertRow icon={AlertTriangle} label="High priority" count={stats.highPriorityCount} variant="destructive" onClick={() => navigate('/admin?tab=analytics')} />
                )}
                {stats.needsReviewCount > 0 && (
                  <AlertRow icon={Flag} label="Needs review" count={stats.needsReviewCount} variant="warning" onClick={() => navigate('/admin?tab=analytics')} />
                )}
                {attentionCount === 0 && (
                  <div className="text-center py-2 text-muted-foreground text-xs">
                    ✨ All clear
                  </div>
                )}
              </div>
            </AccordionSection>

            {/* Content Health */}
            <AccordionSection icon={Heart} title="Content Health" defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                <MiniCard icon={ThumbsUp} label="Helpful" value={`${stats.helpfulPercent}%`} variant="success" />
                <MiniCard icon={ThumbsDown} label="Not helpful" value={`${stats.unhelpfulPercent}%`} variant={stats.unhelpfulPercent > 20 ? 'danger' : 'default'} />
                <MiniCard icon={AlertTriangle} label="High Priority" value={stats.highPriorityCount} variant={stats.highPriorityCount > 0 ? 'danger' : 'default'} />
                <MiniCard icon={Flag} label="Needs Review" value={stats.needsReviewCount} variant={stats.needsReviewCount > 0 ? 'warning' : 'default'} />
              </div>
            </AccordionSection>

            {/* Quick Actions */}
            <AccordionSection icon={Zap} title="Quick Actions" defaultOpen>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin?tab=sources')}>
                  <Upload className="h-3 w-3" /> Manage content
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin?tab=ai-settings')}>
                  <FileQuestion className="h-3 w-3" /> Content Factory
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin/inbox')}>
                  <Inbox className="h-3 w-3" /> Open inbox
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin?tab=analytics')}>
                  <BarChart3 className="h-3 w-3" /> Analytics
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin/overview')}>
                  <Flag className="h-3 w-3" /> Monitoring
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate('/admin')}>
                  <Shield className="h-3 w-3" /> Admin Panel
                </Button>
              </div>
            </AccordionSection>

            {/* Recent Activity */}
            <AccordionSection icon={Activity} title="Recent Activity" defaultOpen={false}>
              {stats.recentActivity.length > 0 ? (
                <div className="space-y-1.5">
                  {stats.recentActivity.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-start gap-2 py-1">
                      <div className={cn(
                        "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0",
                        item.type === 'question' && 'bg-blue-500/10',
                        item.type === 'feedback' && 'bg-yellow-500/10',
                        item.type === 'activity' && 'bg-muted',
                      )}>
                        {item.type === 'question' && <HelpCircle className="h-2.5 w-2.5 text-blue-500" />}
                        {item.type === 'feedback' && <MessageSquare className="h-2.5 w-2.5 text-yellow-600" />}
                        {item.type === 'activity' && <Activity className="h-2.5 w-2.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{item.summary}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No recent activity</p>
              )}
            </AccordionSection>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ── Accordion Section ── */

function AccordionSection({
  icon: Icon,
  title,
  badge,
  badgeVariant = 'secondary',
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: number;
  badgeVariant?: 'destructive' | 'secondary';
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 pt-3 px-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {title}
              {badge !== undefined && badge > 0 && (
                <Badge variant={badgeVariant} className="ml-1 h-4 px-1 text-[9px]">
                  {badge}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 px-3 pb-3">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ── Alert Row ── */

function AlertRow({
  icon: Icon,
  label,
  count,
  variant,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  variant: 'destructive' | 'warning' | 'muted';
  onClick: () => void;
}) {
  const bgMap = {
    destructive: 'bg-destructive/10 hover:bg-destructive/15',
    warning: 'bg-yellow-500/10 hover:bg-yellow-500/15',
    muted: 'bg-muted hover:bg-muted/80',
  };
  const iconColor = {
    destructive: 'text-destructive',
    warning: 'text-yellow-600',
    muted: 'text-muted-foreground',
  };

  return (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left", bgMap[variant])}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", iconColor[variant])} />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <Badge variant={variant === 'destructive' ? 'destructive' : 'secondary'} className="text-[10px] h-4 px-1">{count}</Badge>
    </button>
  );
}

/* ── Mini Card ── */

function MiniCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
  isText = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  isText?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-2.5 text-center",
      variant === 'warning' && 'border-orange-500/30 bg-orange-500/5',
      variant === 'danger' && 'border-destructive/30 bg-destructive/5',
      variant === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
    )}>
      <Icon className={cn(
        "h-3.5 w-3.5 mx-auto mb-0.5",
        variant === 'warning' && 'text-orange-500',
        variant === 'danger' && 'text-destructive',
        variant === 'success' && 'text-emerald-500',
        variant === 'default' && 'text-muted-foreground',
      )} />
      <p className={cn("font-bold", isText ? "text-xs" : "text-base")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
