import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ListTodo, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  useAIBatchJobs, 
  useStartBatchJob, 
  useCancelBatchJob, 
  useRetryBatchJob,
  useDeleteBatchJob,
  AIBatchJob,
  StepResult
} from '@/hooks/useAIBatchJobs';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'bg-yellow-500', label: 'Pending' },
  processing: { icon: Loader2, color: 'bg-blue-500', label: 'Processing' },
  paused: { icon: Pause, color: 'bg-orange-500', label: 'Paused' },
  completed: { icon: CheckCircle2, color: 'bg-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'bg-red-500', label: 'Failed' },
  cancelled: { icon: AlertCircle, color: 'bg-gray-500', label: 'Cancelled' },
};

const STEP_STATUS_CONFIG = {
  pending: { icon: Clock, className: 'text-muted-foreground' },
  generating: { icon: Loader2, className: 'text-blue-500 animate-spin' },
  approving: { icon: Loader2, className: 'text-purple-500 animate-spin' },
  completed: { icon: CheckCircle2, className: 'text-green-500' },
  failed: { icon: XCircle, className: 'text-destructive' },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQs',
  flashcard: 'Flashcards',
  osce: 'OSCE Questions',
  essay: 'Short Questions',
  matching: 'Matching Questions',
  clinical_case: 'Interactive Cases',
  virtual_patient: 'Interactive Cases',
  mind_map: 'Mind Maps',
  guided_explanation: 'Guided Explanations',
  worked_case: 'Interactive Cases',
  case_scenario: 'Interactive Cases',
};

interface StepResultItemProps {
  step: StepResult;
}

function StepResultItem({ step }: StepResultItemProps) {
  const config = STEP_STATUS_CONFIG[step.status];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center justify-between p-2 bg-background rounded border">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`w-4 h-4 flex-shrink-0 ${config.className}`} />
        <span className="font-medium truncate">
          {CONTENT_TYPE_LABELS[step.content_type] || step.content_type}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
        {step.status === 'completed' ? (
          <span className="text-primary">
            {step.inserted_count > 0 
              ? `${step.inserted_count} inserted` 
              : `${step.generated_count} generated`}
          </span>
        ) : step.status === 'failed' ? (
          <span className="text-destructive text-xs max-w-[200px] truncate" title={step.error_message || ''}>
            {step.error_message || 'Failed'}
          </span>
        ) : step.status === 'generating' ? (
          <span>Generating...</span>
        ) : step.status === 'approving' ? (
          <span>Approving...</span>
        ) : (
          <span>Pending</span>
        )}
      </div>
    </div>
  );
}

interface JobCardProps {
  job: AIBatchJob;
  onStart: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

function JobCard({ job, onStart, onCancel, onRetry, onDelete, isLoading }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[job.status];
  const StatusIcon = statusConfig.icon;
  const progress = job.total_steps > 0 ? (job.current_step / job.total_steps) * 100 : 0;

  const stepResults = job.step_results || [];
  const completedSteps = stepResults.filter(s => s.status === 'completed').length;
  const failedSteps = stepResults.filter(s => s.status === 'failed').length;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${statusConfig.color}/10`}>
                  <StatusIcon className={`w-4 h-4 ${job.status === 'processing' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {job.module?.slug}: {job.chapter?.title || 'All Chapters'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {statusConfig.label}
                    </Badge>
                    {job.auto_approve && (
                      <Badge variant="secondary" className="text-xs">Auto-approve</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {job.content_types.map(t => CONTENT_TYPE_LABELS[t] || t).join(', ')}
                    </span>
                    <span>•</span>
                    <span>
                      {job.created_at && formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {(job.status === 'processing' || job.status === 'paused') && (
                    <div className="mt-2 space-y-1">
                      <Progress value={progress} className="h-1.5" />
                      <span className="text-xs text-muted-foreground">
                        Step {job.current_step} of {job.total_steps}
                      </span>
                    </div>
                  )}
                  {(job.status === 'completed' || job.status === 'failed') && stepResults.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {completedSteps > 0 && (
                        <span className="text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {completedSteps} completed
                        </span>
                      )}
                      {failedSteps > 0 && (
                        <span className="text-destructive flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          {failedSteps} failed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30 space-y-4">
            {/* Step Results */}
            {stepResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Step Results
                </h4>
                <div className="space-y-2">
                  {stepResults.map((step, idx) => (
                    <StepResultItem key={idx} step={step} />
                  ))}
                </div>
              </div>
            )}

            {/* Quantities */}
            <div>
              <h4 className="text-sm font-medium mb-2">Content Quantities</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(job.quantities).map(([type, qty]) => (
                  <Badge key={type} variant="outline">
                    {CONTENT_TYPE_LABELS[type] || type}: {qty as number}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Document */}
            {job.document && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>Source: {job.document.title}</span>
              </div>
            )}

            {/* Error Message */}
            {job.error_message && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{job.error_message}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              {job.created_at && (
                <div>Created: {format(new Date(job.created_at), 'MMM d, yyyy HH:mm')}</div>
              )}
              {job.started_at && (
                <div>Started: {format(new Date(job.started_at), 'MMM d, yyyy HH:mm')}</div>
              )}
              {job.completed_at && (
                <div>Completed: {format(new Date(job.completed_at), 'MMM d, yyyy HH:mm')}</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {job.status === 'pending' && (
                <Button size="sm" onClick={onStart} disabled={isLoading}>
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
              {(job.status === 'pending' || job.status === 'paused') && (
                <Button size="sm" variant="outline" onClick={onCancel} disabled={isLoading}>
                  <XCircle className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              )}
              {job.status === 'failed' && (
                <Button size="sm" variant="outline" onClick={onRetry} disabled={isLoading}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              {['pending', 'completed', 'failed', 'cancelled'].includes(job.status) && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
                  onClick={onDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface AIBatchJobsListProps {
  moduleId?: string;
}

export function AIBatchJobsList({ moduleId }: AIBatchJobsListProps) {
  const { data: jobs, isLoading } = useAIBatchJobs(moduleId);
  const startJob = useStartBatchJob();
  const cancelJob = useCancelBatchJob();
  const retryJob = useRetryBatchJob();
  const deleteJob = useDeleteBatchJob();
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isActionLoading = startJob.isPending || cancelJob.isPending || retryJob.isPending || deleteJob.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            Batch Generation Jobs
          </CardTitle>
          <CardDescription>
            Monitor and manage AI content generation batch jobs. Each step runs sequentially with a 2-second delay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!jobs || jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No batch jobs yet</p>
              <p className="text-sm">Start a batch generation from the PDF Library</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStart={() => startJob.mutate(job.id)}
                    onCancel={() => cancelJob.mutate(job.id)}
                    onRetry={() => retryJob.mutate(job.id)}
                    onDelete={() => setDeleteConfirm(job.id)}
                    isLoading={isActionLoading}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Batch Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this batch job? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirm) {
                  deleteJob.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
