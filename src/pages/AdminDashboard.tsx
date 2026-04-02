import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAdminOverviewStats } from '@/hooks/useAdminOverviewStats';
import { useAuthContext } from '@/contexts/AuthContext';
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
  Zap, Heart, Server,
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
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
          <Skeleton className="h-8 w-64" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
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
      <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
        <h1 className="text-xl md:text-2xl font-heading font-bold">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>

        {/* Section 1: Alerts / Attention */}
        <AccordionSection
          icon={AlertTriangle}
          title="Alerts & Attention"
          badge={attentionCount > 0 ? attentionCount : undefined}
          badgeVariant="destructive"
          defaultOpen={attentionCount > 0}
        >
          <div className="space-y-2">
            {stats.unansweredOver48h > 0 && (
              <AlertRow
                icon={Clock}
                label="Questions unanswered >48h"
                sub="Urgent — students waiting"
                count={stats.unansweredOver48h}
                variant="destructive"
                onClick={() => navigate('/admin/inbox?urgency=overdue')}
              />
            )}
            {stats.unansweredOver24h > 0 && stats.unansweredOver24h !== stats.unansweredOver48h && (
              <AlertRow
                icon={Clock}
                label="Questions unanswered >24h"
                sub="Needs attention"
                count={stats.unansweredOver24h}
                variant="warning"
                onClick={() => navigate('/admin/inbox?urgency=attention')}
              />
            )}
            {stats.pendingFeedback > 0 && (
              <AlertRow
                icon={MessageSquare}
                label="Pending feedback"
                sub="Not yet reviewed"
                count={stats.pendingFeedback}
                variant="warning"
                onClick={() => navigate('/admin?tab=analytics')}
              />
            )}
            {stats.highPriorityCount > 0 && (
              <AlertRow
                icon={AlertTriangle}
                label="High priority content"
                sub="Significant quality concerns"
                count={stats.highPriorityCount}
                variant="destructive"
                onClick={() => navigate('/admin?tab=analytics')}
              />
            )}
            {stats.needsReviewCount > 0 && (
              <AlertRow
                icon={AlertTriangle}
                label="Content needs review"
                sub="Quality signals detected"
                count={stats.needsReviewCount}
                variant="warning"
                onClick={() => navigate('/admin?tab=analytics')}
              />
            )}
            {stats.itemsNeedingReview > 0 && (
              <AlertRow
                icon={Flag}
                label="Items needing review"
                sub="Content review notes"
                count={stats.itemsNeedingReview}
                variant="muted"
                onClick={() => navigate('/admin?tab=analytics')}
              />
            )}
            {attentionCount === 0 && (
              <div className="text-center py-3 text-muted-foreground text-sm">
                ✨ All clear — nothing needs immediate attention
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Section 2: Content Health */}
        <AccordionSection
          icon={Heart}
          title="Content Health"
          defaultOpen
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniCard icon={ThumbsUp} label="Helpful" value={`${stats.helpfulPercent}%`} variant="success" />
            <MiniCard icon={ThumbsDown} label="Not helpful" value={`${stats.unhelpfulPercent}%`} variant={stats.unhelpfulPercent > 20 ? 'danger' : 'default'} />
            <MiniCard icon={AlertTriangle} label="High Priority" value={stats.highPriorityCount} variant={stats.highPriorityCount > 0 ? 'danger' : 'default'} />
            <MiniCard icon={Flag} label="Needs Review" value={stats.needsReviewCount} variant={stats.needsReviewCount > 0 ? 'warning' : 'default'} />
          </div>
        </AccordionSection>

        {/* Section 3: Questions & Feedback */}
        <AccordionSection
          icon={MessageCircle}
          title="Questions & Feedback"
          defaultOpen={false}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniCard icon={HelpCircle} label="New today" value={stats.newQuestionsToday} />
            <MiniCard icon={Clock} label="Unanswered >24h" value={stats.unansweredOver24h} variant={stats.unansweredOver24h > 0 ? 'warning' : 'default'} />
            <MiniCard icon={MessageSquare} label="Feedback (7d)" value={stats.feedbackLast7Days} />
            <MiniCard icon={Flag} label="Top issue" value={stats.topFeedbackCategory || '—'} isText />
          </div>
        </AccordionSection>

        {/* Section 4: Recent Activity */}
        <AccordionSection
          icon={Activity}
          title="Recent Activity"
          defaultOpen={false}
        >
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-1.5">
                  <div className={cn(
                    "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                    item.type === 'question' && 'bg-blue-500/10',
                    item.type === 'feedback' && 'bg-yellow-500/10',
                    item.type === 'activity' && 'bg-muted',
                  )}>
                    {item.type === 'question' && <HelpCircle className="h-3 w-3 text-blue-500" />}
                    {item.type === 'feedback' && <MessageSquare className="h-3 w-3 text-yellow-600" />}
                    {item.type === 'activity' && <Activity className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.summary}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">No recent activity</p>
          )}
        </AccordionSection>

        {/* Section 5: Quick Actions */}
        <AccordionSection
          icon={Zap}
          title="Quick Actions"
          defaultOpen
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/learning')}>
              <Plus className="h-3.5 w-3.5" /> Browse modules
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=sources')}>
              <Upload className="h-3.5 w-3.5" /> Manage content
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=ai-settings')}>
              <FileQuestion className="h-3.5 w-3.5" /> Content Factory
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/inbox')}>
              <Inbox className="h-3.5 w-3.5" /> Open inbox
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=analytics')}>
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/overview')}>
              <Flag className="h-3.5 w-3.5" /> Monitoring
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin')}>
              <Shield className="h-3.5 w-3.5" /> Admin Panel
            </Button>
          </div>
        </AccordionSection>
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
          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              {title}
              {badge !== undefined && badge > 0 && (
                <Badge variant={badgeVariant} className="ml-1 h-5 px-1.5 text-[10px]">
                  {badge}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 ml-auto text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ── Alert Row ── */

function AlertRow({
  icon: Icon,
  label,
  sub,
  count,
  variant,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
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
      className={cn("w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left", bgMap[variant])}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-4 w-4", iconColor[variant])} />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
      <Badge variant={variant === 'destructive' ? 'destructive' : 'secondary'}>{count}</Badge>
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
      "rounded-lg border p-3 text-center",
      variant === 'warning' && 'border-orange-500/30 bg-orange-500/5',
      variant === 'danger' && 'border-destructive/30 bg-destructive/5',
      variant === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
    )}>
      <Icon className={cn(
        "h-4 w-4 mx-auto mb-1",
        variant === 'warning' && 'text-orange-500',
        variant === 'danger' && 'text-destructive',
        variant === 'success' && 'text-emerald-500',
        variant === 'default' && 'text-muted-foreground',
      )} />
      <p className={cn("font-bold", isText ? "text-sm" : "text-lg")}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
