import { Users, User, Monitor, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePresence, type PresenceUserState } from '@/contexts/PresenceContext';
import { useMemo } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  student:          { label: 'Student',        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  teacher:          { label: 'Teacher',        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  admin:            { label: 'Admin',          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  department_admin: { label: 'Dept Admin',     className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  topic_admin:      { label: 'Topic Admin',    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  module_admin:     { label: 'Module Admin',   className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  platform_admin:   { label: 'Platform Admin', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  super_admin:      { label: 'Super Admin',    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

const ACTIVITY_MAP: Record<string, Record<string, string>> = {
  resources: {
    lectures:            'Watching Videos',
    flashcards:          'Studying Flashcards',
    mind_maps:           'Exploring Visual Resources',
    guided_explanations: 'Using Socrates',
    reference_materials: 'Reading Reference Materials',
    clinical_tools:      'Using Clinical Tools',
  },
  interactive: {
    cases:    'Doing Cases',
    pathways: 'Exploring Pathways',
  },
  practice: {
    mcqs:       'Practicing MCQs',
    sba:        'Practicing SBA',
    true_false: 'Practicing True/False',
    essays:     'Practicing Short Questions',
    osce:       'Practicing OSCE',
    practical:  'Practicing Practicals',
    matching:   'Practicing Matching',
    images:     'Practicing Image Questions',
  },
  test: {
    _default: 'Testing Themselves',
  },
};

// Short labels matching the app's UI tabs
const TAB_SHORT: Record<string, Record<string, string>> = {
  resources: {
    lectures:            'Videos',
    flashcards:          'Flashcards',
    mind_maps:           'Mind Maps',
    guided_explanations: 'Socrates',
    reference_materials: 'Reference Materials',
    clinical_tools:      'Clinical Tools',
  },
  interactive: {
    cases:    'Cases',
    pathways: 'Pathways',
  },
  practice: {
    mcqs:       'MCQs',
    sba:        'SBA',
    true_false: 'True / False',
    essays:     'Short Questions',
    osce:       'OSCE',
    practical:  'Practicals',
    matching:   'Matching',
    images:     'Image Questions',
  },
};

const SECTION_SHORT: Record<string, string> = {
  resources:   'Resources',
  interactive: 'Interactive',
  practice:    'Practice',
  test:        'Test Yourself',
};

const PAGE_LABELS: Record<string, string> = {
  home:            'Home Page',
  year:            'Year Overview',
  module:          'Module Browser',
  topic:           'Topic Page',
  chapter:         'Chapter Page',
  exam:            'Taking an Exam',
  practice:        'Flashcard Review',
  virtual_patient: 'Virtual Patient',
  case_summary:    'Case Summary',
  other:           'Browsing',
};

function getActivity(state: PresenceUserState): string {
  if ((state.page === 'topic' || state.page === 'chapter') && state.section_mode) {
    if (state.section_mode === 'test') return 'Testing Themselves';
    const sectionMap = ACTIVITY_MAP[state.section_mode];
    if (sectionMap && state.active_tab && sectionMap[state.active_tab]) {
      return sectionMap[state.active_tab];
    }
    const sectionLabel: Record<string, string> = {
      resources:   'In Resources',
      interactive: 'Interactive Section',
      practice:    'Self Assessment',
    };
    return sectionLabel[state.section_mode] ?? 'Studying';
  }
  return PAGE_LABELS[state.page] ?? 'Browsing';
}

function getUserActivity(state: PresenceUserState): { section: string | null; tab: string | null } {
  const isContentPage = state.page === 'topic' || state.page === 'chapter';
  if (!isContentPage || !state.section_mode) return { section: null, tab: null };
  const section = SECTION_SHORT[state.section_mode] ?? state.section_mode;
  let tab: string | null = null;
  if (state.section_mode === 'test') {
    tab = null; // section label is enough
  } else if (state.active_tab) {
    tab = TAB_SHORT[state.section_mode]?.[state.active_tab] ?? null;
  }
  return { section, tab };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserPresenceCard({
  state,
  yearName,
}: {
  state: PresenceUserState;
  yearName?: string;
}) {
  const roleConfig = ROLE_CONFIG[state.role] ?? { label: state.role, className: 'bg-muted text-muted-foreground' };
  const { section, tab } = getUserActivity(state);
  const pageLabel = PAGE_LABELS[state.page] ?? 'Browsing';

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4 space-y-2">
        {/* Role badge */}
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleConfig.className}`}>
          {roleConfig.label}
        </span>

        {/* Year + Module */}
        <div className="space-y-0.5">
          {yearName && (
            <p className="text-xs text-muted-foreground">{yearName}</p>
          )}
          {state.module_name && (
            <p className="text-sm font-medium truncate">{state.module_name}</p>
          )}
          {state.topic_name && (
            <p className="text-xs text-muted-foreground truncate">{state.topic_name}</p>
          )}
        </div>

        {/* Activity breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {section ? (
            <>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{section}</Badge>
              {tab && (
                <>
                  <span className="text-muted-foreground text-xs">›</span>
                  <Badge variant="outline" className="text-xs h-5 px-1.5 text-primary border-primary/30">{tab}</Badge>
                </>
              )}
            </>
          ) : (
            <span className="text-xs text-primary/80 font-medium">{pageLabel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-4 text-right shrink-0">{count}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RealtimeAnalyticsTab() {
  const { onlineUsers, onlineCount, wsCount } = usePresence();
  const stats = useMemo(() => {
    const students = onlineUsers.filter(u => u.state.role === 'student').length;
    const staff    = onlineUsers.filter(u => ['teacher', 'module_admin', 'topic_admin', 'department_admin'].includes(u.state.role)).length;
    const admins   = onlineUsers.filter(u => ['admin', 'platform_admin', 'super_admin'].includes(u.state.role)).length;
    return { students, staff, admins };
  }, [onlineUsers]);

  const byPage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of onlineUsers) {
      const label = PAGE_LABELS[u.state.page] ?? 'Browsing';
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [onlineUsers]);

  const byActivity = useMemo(() => {
    // section → { total, tabs: { tabLabel → count } }
    const sections: Record<string, { total: number; tabs: Record<string, number> }> = {};

    for (const u of onlineUsers) {
      const s = u.state;
      const isContentPage = s.page === 'topic' || s.page === 'chapter';

      if (isContentPage && s.section_mode) {
        const sectionLabel: Record<string, string> = {
          resources:   'Resources',
          interactive: 'Interactive',
          practice:    'Practice',
          test:        'Test',
        };
        const secLabel = sectionLabel[s.section_mode] ?? s.section_mode;

        if (!sections[secLabel]) sections[secLabel] = { total: 0, tabs: {} };
        sections[secLabel].total += 1;

        // tab label within section
        let tabLabel = 'General';
        if (s.section_mode === 'test') {
          tabLabel = 'Testing Themselves';
        } else {
          const tabMap = ACTIVITY_MAP[s.section_mode];
          if (tabMap && s.active_tab && tabMap[s.active_tab]) {
            tabLabel = tabMap[s.active_tab];
          }
        }
        sections[secLabel].tabs[tabLabel] = (sections[secLabel].tabs[tabLabel] ?? 0) + 1;
      } else {
        // Non-content pages go under "Other"
        const pageLabel = PAGE_LABELS[s.page] ?? 'Browsing';
        if (!sections['Other']) sections['Other'] = { total: 0, tabs: {} };
        sections['Other'].total += 1;
        sections['Other'].tabs[pageLabel] = (sections['Other'].tabs[pageLabel] ?? 0) + 1;
      }
    }

    return Object.entries(sections).sort((a, b) => b[1].total - a[1].total);
  }, [onlineUsers]);

  const byResourceTab = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of onlineUsers) {
      const s = u.state;
      if ((s.page === 'topic' || s.page === 'chapter') && s.section_mode === 'resources' && s.active_tab) {
        const label = TAB_SHORT.resources[s.active_tab] ?? s.active_tab;
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [onlineUsers]);

  const byRole = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of onlineUsers) {
      const label = ROLE_CONFIG[u.state.role]?.label ?? u.state.role;
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [onlineUsers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <h3 className="text-lg font-semibold">
            {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">Supabase Realtime · Updates live</span>
      </div>

      {/* WebSocket connections bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">WebSocket Connections</span>
            <span className="text-sm font-semibold">{wsCount} <span className="text-muted-foreground font-normal">/ 500</span></span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-primary/70"
              style={{ width: `${Math.min((wsCount / 500) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Each browser tab = 1 connection · Multi-tab users counted once in user total</p>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users}    label="Total Online" value={onlineCount}      color="bg-primary/10 text-primary" />
        <StatCard icon={User}     label="Students"     value={stats.students}   color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" />
        <StatCard icon={BookOpen} label="Staff"        value={stats.staff}      color="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400" />
        <StatCard icon={Monitor}  label="Admins"       value={stats.admins}     color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" />
      </div>

      {/* Live Resource Usage */}
      {byResourceTab.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Live Resource Usage
              <span className="ml-auto text-xs font-normal text-muted-foreground">{byResourceTab.reduce((s, [, c]) => s + c, 0)} in resources now</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byResourceTab.map(([label, count]) => (
              <BreakdownRow key={label} label={label} count={count} total={byResourceTab.reduce((s, [, c]) => s + c, 0)} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Breakdowns */}
      {onlineCount === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users currently online</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* By Page */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                By Page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byPage.length > 0
                ? byPage.map(([label, count]) => (
                    <BreakdownRow key={label} label={label} count={count} total={onlineCount} />
                  ))
                : <p className="text-sm text-muted-foreground">No users online</p>
              }
            </CardContent>
          </Card>

          {/* By Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                By Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {byActivity.length > 0
                ? byActivity.map(([section, { total, tabs }]) => (
                    <div key={section}>
                      {/* Section header */}
                      <BreakdownRow label={section} count={total} total={onlineCount} />
                      {/* Sub-tabs */}
                      {Object.entries(tabs).sort((a, b) => b[1] - a[1]).map(([tabLabel, tabCount]) => (
                        <div key={tabLabel} className="ml-5 mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-3 text-right shrink-0">{tabCount}</span>
                          <span className="text-xs text-muted-foreground">↳ {tabLabel}</span>
                        </div>
                      ))}
                    </div>
                  ))
                : <p className="text-sm text-muted-foreground">No users online</p>
              }
            </CardContent>
          </Card>

          {/* By Role */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                By Role
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byRole.length > 0
                ? byRole.map(([label, count]) => (
                    <BreakdownRow key={label} label={label} count={count} total={onlineCount} />
                  ))
                : <p className="text-sm text-muted-foreground">No users online</p>
              }
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
