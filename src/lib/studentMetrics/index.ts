export { classifyChapterState, getModuleStatusFromMetrics, getPerformanceTrend, getConsistencyScore, calculateChapterReadiness } from './classifyChapterState';
export type { ChapterState, ChapterMetricsInput, PerformanceTrend } from './classifyChapterState';
export { buildDashboardSuggestions, getWeakTopics, calculateAggregateReadiness } from './buildDashboardSuggestions';
export type { DashboardAction, WeakTopic } from './buildDashboardSuggestions';
export { classifyLearningPattern, getPatternPriorityBoost, generateConfidenceInsight } from './classifyLearningPattern';
export type { LearningPattern, LearningPatternResult } from './classifyLearningPattern';
export { getRevisionState, calculateReviewStrength, getReviewType, getDueReviewChapters } from './reviewScheduling';
export type { RevisionState } from './reviewScheduling';
export { buildAdaptiveStudyPlan } from './buildAdaptiveStudyPlan';
export type { PlannedTask, AdaptiveStudyPlan, AdaptivePlanInput, ChapterInfo, TaskStudyModeKey } from './buildAdaptiveStudyPlan';
export { buildCoachInsights } from './buildCoachInsights';
export type { CoachInsight, CoachInsightInput } from './buildCoachInsights';
export { buildRiskAlerts, RISK_THRESHOLDS } from './buildRiskAlerts';
export type { RiskAlert, RiskAlertInput } from './buildRiskAlerts';
export { buildExamReadinessIndicator, INDICATOR_THRESHOLDS } from './examReadinessIndicator';
export type { ExamReadinessIndicator, IndicatorInput, ReadinessLevel } from './examReadinessIndicator';

// Planner thresholds & exam mode
export {
  classifyExamMode,
  getDaysUntilExam,
  PRIORITY_CAP,
  MCQ_COMPLETION_THRESHOLD,
  COVERAGE_COMPLETION_THRESHOLD,
  READINESS_COMPLETION_THRESHOLD,
} from './plannerThresholds';
export type { ExamMode } from './plannerThresholds';
