import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAdminOverviewStats } from '@/hooks/useAdminOverviewStats';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, MessageCircle, ThumbsUp, ThumbsDown,
  Plus, Upload, FileQuestion, Inbox, Flag,
  Clock, ArrowRight, BarChart3, Shield, Activity,
  HelpCircle, MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminOverview() {
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
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-3 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="md:col-span-2 space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-40" />)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
        {/* Greeting */}
        <h1 className="text-xl md:text-2xl font-heading font-bold">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ==================== CENTER COLUMN (60%) ==================== */}
          <div className="lg:col-span-3 space-y-5">

            {/* SECTION 1 — Needs Attention */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.unansweredOver48h > 0 && (
                  <button
                    onClick={() => navigate('/admin/inbox?urgency=overdue')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/15 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Questions unanswered &gt;48h</p>
                        <p className="text-xs text-muted-foreground">Urgent — students waiting</p>
                      </div>
                    </div>
                    <Badge variant="destructive">{stats.unansweredOver48h}</Badge>
                  </button>
                )}
                {stats.unansweredOver24h > 0 && stats.unansweredOver24h !== stats.unansweredOver48h && (
                  <button
                    onClick={() => navigate('/admin/inbox?urgency=attention')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/15 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Questions unanswered &gt;24h</p>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                      </div>
                    </div>
                    <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">{stats.unansweredOver24h}</Badge>
                  </button>
                )}
                {stats.pendingFeedback > 0 && (
                  <button
                    onClick={() => navigate('/admin?tab=content-analytics')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Pending feedback</p>
                        <p className="text-xs text-muted-foreground">Not yet reviewed</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{stats.pendingFeedback}</Badge>
                  </button>
                )}
                {stats.highPriorityCount > 0 && (
                  <button
                    onClick={() => navigate('/admin?tab=content-analytics')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/15 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-foreground">High priority content</p>
                        <p className="text-xs text-muted-foreground">Significant quality concerns</p>
                      </div>
                    </div>
                    <Badge variant="destructive">{stats.highPriorityCount}</Badge>
                  </button>
                )}
                {stats.needsReviewCount > 0 && (
                  <button
                    onClick={() => navigate('/admin?tab=content-analytics')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Content needs review</p>
                        <p className="text-xs text-muted-foreground">Quality signals detected</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">{stats.needsReviewCount}</Badge>
                  </button>
                )}
                {stats.itemsNeedingReview > 0 && (
                  <button
                    onClick={() => navigate('/admin?tab=content-analytics')}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Items needing review</p>
                        <p className="text-xs text-muted-foreground">Content review notes</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{stats.itemsNeedingReview}</Badge>
                  </button>
                )}
                {stats.unansweredQuestions === 0 && stats.pendingFeedback === 0 && stats.itemsNeedingReview === 0 && stats.highPriorityCount === 0 && stats.needsReviewCount === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    ✨ All clear — nothing needs immediate attention
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SECTION 2 — Questions & Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Questions & Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="New today" value={stats.newQuestionsToday} icon={HelpCircle} />
                  <StatCard label="Unanswered >24h" value={stats.unansweredOver24h} icon={Clock} variant={stats.unansweredOver24h > 0 ? 'warning' : 'default'} />
                  <StatCard label="Feedback (7d)" value={stats.feedbackLast7Days} icon={MessageSquare} />
                  <StatCard label="Top issue" value={stats.topFeedbackCategory || '—'} icon={Flag} isText />
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3 — Content Health */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Content Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Helpful" value={`${stats.helpfulPercent}%`} icon={ThumbsUp} variant="success" isText />
                  <StatCard label="Not helpful" value={`${stats.unhelpfulPercent}%`} icon={ThumbsDown} variant={stats.unhelpfulPercent > 20 ? 'danger' : 'default'} isText />
                  <StatCard label="High Priority" value={stats.highPriorityCount} icon={AlertTriangle} variant={stats.highPriorityCount > 0 ? 'danger' : 'default'} />
                  <StatCard label="Needs Review" value={stats.needsReviewCount} icon={Flag} variant={stats.needsReviewCount > 0 ? 'warning' : 'default'} />
                </div>
              </CardContent>
            </Card>

            {/* Modules removed — use Learning tab for module browsing */}

            {/* SECTION 5 — Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚡ Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=curriculum')}>
                    <Plus className="h-3.5 w-3.5" /> Add content
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=curriculum')}>
                    <Upload className="h-3.5 w-3.5" /> Upload video
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=content-factory')}>
                    <FileQuestion className="h-3.5 w-3.5" /> Create MCQ
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin/inbox')}>
                    <Inbox className="h-3.5 w-3.5" /> Open inbox
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/admin?tab=content-analytics')}>
                    <Flag className="h-3.5 w-3.5" /> Review flagged
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 6 — Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ==================== RIGHT PANEL (40%) — Desktop/Tablet only ==================== */}
          <div className="hidden lg:block lg:col-span-2 space-y-5">
            {/* Urgent */}
            <Card className="border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Urgent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MiniStat label="Unanswered questions" value={stats.unansweredQuestions} danger={stats.unansweredQuestions > 0} />
                <MiniStat label="Pending feedback" value={stats.pendingFeedback} danger={stats.pendingFeedback > 5} />
                <MiniStat label="Flagged items" value={stats.flaggedItems} danger={stats.flaggedItems > 0} />
              </CardContent>
            </Card>

            {/* Health */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" /> Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MiniStat label="Helpful rate" value={`${stats.helpfulPercent}%`} />
                <MiniStat label="Negative rate" value={`${stats.unhelpfulPercent}%`} danger={stats.unhelpfulPercent > 20} />
                <MiniStat label="Review count" value={stats.itemsNeedingReview} danger={stats.itemsNeedingReview > 0} />
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <QuickLink icon={Inbox} label="Inbox" onClick={() => navigate('/admin/inbox')} />
                <QuickLink icon={BarChart3} label="Analytics" onClick={() => navigate('/admin?tab=content-analytics')} />
                <QuickLink icon={Shield} label="Admin Panel" onClick={() => navigate('/admin')} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ---- Helper components ---- */

function StatCard({ label, value, icon: Icon, variant = 'default', isText = false }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
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

function MiniStat({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", danger && "text-destructive")}>{value}</span>
    </div>
  );
}

function QuickLink({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm font-medium text-foreground">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
