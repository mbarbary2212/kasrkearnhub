import { classifyChapterState, getPerformanceTrend, type ChapterState, type PerformanceTrend } from './classifyChapterState';
import type { StudentChapterMetric } from '@/hooks/useStudentChapterMetrics';
import { getExamWeightBoost, type ChapterExamWeight } from '@/hooks/useChapterExamWeights';

// ─── Configurable thresholds ──────────────────────────────────

export const RISK_THRESHOLDS = {
  /** Days without any activity to trigger inactivity alert */
  inactivityDays: 3,
  /** Minimum weak chapters to trigger cluster alert */
  weakChapterMin: 2,
  /** Minimum overdue flashcard chapters to trigger review alert */
  overdueChapterMin: 2,
  /** Readiness below this in a high-yield chapter triggers alert */
  lowReadinessThreshold: 40,
  /** Exam weight boost >= this is considered "high-yield" */
  highYieldBoost: 1.4,
  /** Minimum declining chapters to trigger trend alert */
  decliningMin: 2,
  /** Maximum alerts shown */
  maxAlerts: 3,
} as const;

// ─── Types ────────────────────────────────────────────────────

export interface RiskAlert {
  id: string;
  severity: 'high' | 'medium';
  message: string;
  action?: string;
  actionRoute?: string;
  /** Higher = more urgent, shown first */
  priority: number;
}

export interface RiskAlertInput {
  metrics: StudentChapterMetric[];
  chapterTitleMap: Map<string, string>;
  examWeightMap?: Map<string, ChapterExamWeight>;
  moduleId?: string;
  /** Most recent activity date across all chapters */
  lastActivityDate?: string | null;
  /** Chapter IDs already surfaced by coach insights — used to suppress overlapping alerts */
  coachChapterIds?: Set<string>;
}

// ─── Helpers ──────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function chapterRoute(moduleId: string | undefined, chapterId: string, tab?: string): string | undefined {
  if (!moduleId) return undefined;
  let route = `/modules/${moduleId}/chapters/${chapterId}`;
  if (tab) route += `?section=${tab}`;
  return route;
}

// ─── Alert generators (each returns 0-1 alert) ───────────────

function inactivityAlert(input: RiskAlertInput): RiskAlert | null {
  // Find the most recent activity across all metrics
  let latestActivity: string | null = input.lastActivityDate ?? null;

  if (!latestActivity) {
    for (const m of input.metrics) {
      if (m.last_activity_at && (!latestActivity || m.last_activity_at > latestActivity)) {
        latestActivity = m.last_activity_at;
      }
    }
  }

  const days = daysSince(latestActivity);
  if (days === null || days < RISK_THRESHOLDS.inactivityDays) return null;

  const rounded = Math.floor(days);
  return {
    id: 'inactivity',
    severity: rounded >= 7 ? 'high' : 'medium',
    message: `You haven't studied in ${rounded} day${rounded === 1 ? '' : 's'}`,
    action: 'Resume studying',
    priority: 95 + Math.min(rounded, 14), // more days = higher priority
  };
}

function weakChapterClusterAlert(input: RiskAlertInput): RiskAlert | null {
  const weakChapters = input.metrics
    .filter(m => m.mcq_attempts >= 3)
    .filter(m => classifyChapterState(m) === 'weak');

  if (weakChapters.length < RISK_THRESHOLDS.weakChapterMin) return null;

  // Find the worst one to link to
  const worst = weakChapters.sort((a, b) => a.readiness_score - b.readiness_score)[0];
  const title = input.chapterTitleMap.get(worst.chapter_id) || 'a chapter';

  return {
    id: 'weak-cluster',
    severity: weakChapters.length >= 3 ? 'high' : 'medium',
    message: `${weakChapters.length} weak chapters need attention`,
    action: `Start with ${title}`,
    actionRoute: chapterRoute(input.moduleId, worst.chapter_id, 'practice'),
    priority: 85 + weakChapters.length,
  };
}

function overdueReviewAlert(input: RiskAlertInput): RiskAlert | null {
  const now = new Date().toISOString();
  const overdueChapters = input.metrics.filter(m => {
    if (!m.next_review_at) return false;
    // Overdue by at least 1 day
    const overdueDays = daysSince(m.next_review_at);
    return overdueDays !== null && overdueDays > 1;
  });

  if (overdueChapters.length < RISK_THRESHOLDS.overdueChapterMin) return null;

  // Also count heavily overdue flashcard chapters
  const heavyOverdue = input.metrics.filter(m => (m.flashcards_overdue ?? 0) >= 5);
  const totalOverdue = Math.max(overdueChapters.length, heavyOverdue.length);

  if (totalOverdue < RISK_THRESHOLDS.overdueChapterMin) return null;

  return {
    id: 'overdue-reviews',
    severity: totalOverdue >= 4 ? 'high' : 'medium',
    message: `Review is piling up — ${totalOverdue} chapter${totalOverdue === 1 ? '' : 's'} overdue`,
    action: 'Review overdue chapters',
    priority: 80 + totalOverdue,
  };
}

function highYieldLowReadinessAlert(input: RiskAlertInput): RiskAlert | null {
  if (!input.examWeightMap) return null;

  const risky = input.metrics
    .filter(m => {
      const boost = getExamWeightBoost(m.chapter_id, input.examWeightMap);
      return boost >= RISK_THRESHOLDS.highYieldBoost
        && m.readiness_score < RISK_THRESHOLDS.lowReadinessThreshold
        && m.mcq_attempts >= 1; // has started
    })
    .sort((a, b) => a.readiness_score - b.readiness_score);

  if (risky.length === 0) return null;

  const ch = risky[0];
  const title = input.chapterTitleMap.get(ch.chapter_id) || 'A high-priority chapter';

  return {
    id: 'high-yield-low-readiness',
    severity: 'high',
    message: `${title} is high-priority but not ready yet`,
    action: `Focus on ${title}`,
    actionRoute: chapterRoute(input.moduleId, ch.chapter_id, 'practice'),
    priority: 90,
  };
}

function decliningPerformanceAlert(input: RiskAlertInput): RiskAlert | null {
  const declining = input.metrics
    .filter(m => m.mcq_attempts >= 5 && getPerformanceTrend(m) === 'declining');

  if (declining.length < RISK_THRESHOLDS.decliningMin) return null;

  return {
    id: 'declining-performance',
    severity: declining.length >= 3 ? 'high' : 'medium',
    message: `Performance is dropping in ${declining.length} chapter${declining.length === 1 ? '' : 's'}`,
    action: 'Review declining chapters',
    priority: 78 + declining.length,
  };
}

// ─── Main builder ─────────────────────────────────────────────

export function buildRiskAlerts(input: RiskAlertInput): RiskAlert[] {
  if (input.metrics.length === 0) return [];

  const candidates: RiskAlert[] = [
    inactivityAlert(input),
    highYieldLowReadinessAlert(input),
    weakChapterClusterAlert(input),
    overdueReviewAlert(input),
    decliningPerformanceAlert(input),
  ].filter((a): a is RiskAlert => a !== null);

  // Suppress alerts that overlap with coach insights already visible
  const coachIds = input.coachChapterIds;
  const filtered = coachIds && coachIds.size > 0
    ? candidates.filter(a => {
        // high-yield-low-readiness targets a single chapter the coach likely covers
        if (a.id === 'high-yield-low-readiness') {
          const risky = input.metrics
            .filter(m => {
              const boost = getExamWeightBoost(m.chapter_id, input.examWeightMap);
              return boost >= RISK_THRESHOLDS.highYieldBoost
                && m.readiness_score < RISK_THRESHOLDS.lowReadinessThreshold;
            });
          return !risky.every(m => coachIds.has(m.chapter_id));
        }
        return true;
      })
    : candidates;

  // Sort by priority descending, take max
  return filtered
    .sort((a, b) => b.priority - a.priority)
    .slice(0, RISK_THRESHOLDS.maxAlerts);
}
