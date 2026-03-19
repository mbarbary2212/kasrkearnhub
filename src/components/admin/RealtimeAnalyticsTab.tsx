import { User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { usePresence, type PresenceUserState } from '@/contexts/PresenceContext';
import { useYears } from '@/hooks/useYears';
import { useMemo } from 'react';

// ─── Label maps ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  student:          { label: 'Student',        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  teacher:          { label: 'Teacher',        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  admin:            { label: 'Admin',          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  department_admin: { label: 'Dept Admin',     className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  topic_admin:      { label: 'Topic Admin',    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
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
    essays:     'Practicing Short Answer',
    osce:       'Practicing OSCE',
    practical:  'Practicing Practicals',
    matching:   'Practicing Matching',
    images:     'Practicing Image Questions',
  },
  test: {
    _default: 'Testing Themselves',
  },
};

const PAGE_LABELS: Record<string, string> = {
  home:            'On Home Page',
  year:            'Browsing Year Overview',
  module:          'Browsing Module',
  exam:            'Taking an Exam',
  practice:        'Reviewing Flashcards',
  virtual_patient: 'With Virtual Patient',
  case_summary:    'Reviewing Case Summary',
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

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({
  state,
  yearName,
}: {
  state: PresenceUserState;
  yearName?: string;
}) {
  const roleConfig = ROLE_CONFIG[state.role] ?? { label: state.role, className: '' };
  const activity = getActivity(state);

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Role + Year badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleConfig.className}`}
              >
                {roleConfig.label}
              </span>
              {yearName && (
                <Badge variant="outline" className="text-xs h-5">
                  {yearName}
                </Badge>
              )}
            </div>

            {/* Module */}
            {state.module_name && (
              <p className="text-sm font-medium truncate leading-tight">{state.module_name}</p>
            )}

            {/* Topic / Chapter */}
            {state.topic_name && (
              <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {state.topic_name}
              </p>
            )}

            {/* Activity */}
            <p className="text-xs text-primary/80 mt-1.5 font-medium">{activity}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function RealtimeAnalyticsTab() {
  const { onlineUsers, onlineCount } = usePresence();
  const { data: years } = useYears();

  const yearMap = useMemo(() => {
    const map = new Map<string, string>();
    years?.forEach((y) => map.set(y.id, y.name));
    return map;
  }, [years]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <h3 className="text-lg font-semibold">
          {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Updates in real time · All users shown anonymously
        </span>
      </div>

      {/* Empty state */}
      {onlineCount === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No users currently online</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {onlineUsers.map((user) => (
            <UserCard
              key={user.presence_ref}
              state={user.state}
              yearName={user.state.year_id ? yearMap.get(user.state.year_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
