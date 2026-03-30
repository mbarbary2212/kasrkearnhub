import { useMemo, useCallback } from 'react';
import { Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useChapterBlueprintConfigs,
  useUpsertChapterBlueprint,
  useDeleteChapterBlueprint,
  COMPONENT_TYPES,
  EXAM_TYPES,
  INCLUSION_LEVELS,
  type ChapterBlueprintConfig,
} from '@/hooks/useChapterBlueprint';
import { useModuleChapters } from '@/hooks/useAssessmentBlueprint';

const CROSS_MODULE_SOURCE = '153318ba-32b9-4f8e-9cbc-bdd8df9b9b10';

interface Props {
  moduleId: string;
  yearId: string;
  canManage: boolean;
}

export function ChapterBlueprintTab({ moduleId, yearId, canManage }: Props) {
  const { data: chapters, isLoading: chaptersLoading } = useModuleChapters(moduleId);
  const { data: configs, isLoading: configsLoading } = useChapterBlueprintConfigs(moduleId);

  const upsert = useUpsertChapterBlueprint();
  const remove = useDeleteChapterBlueprint();

  const ownChapters = chapters?.filter(c => c.module_id === moduleId) ?? [];
  const crossChapters = chapters?.filter(c => c.module_id === CROSS_MODULE_SOURCE) ?? [];

  const configMap = useMemo(() => {
    const map = new Map<string, ChapterBlueprintConfig>();
    configs?.forEach(c => {
      map.set(`${c.chapter_id}:${c.exam_type}:${c.component_type}`, c);
    });
    return map;
  }, [configs]);

  const getConfig = useCallback(
    (chapterId: string, examType: string, componentType: string) =>
      configMap.get(`${chapterId}:${examType}:${componentType}`),
    [configMap]
  );

  const handleToggle = useCallback(
    (chapterId: string, examType: string, componentType: string, checked: boolean) => {
      if (checked) {
        upsert.mutate({
          module_id: moduleId,
          chapter_id: chapterId,
          exam_type: examType,
          component_type: componentType,
          inclusion_level: 'average',
        });
      } else {
        remove.mutate({ chapter_id: chapterId, exam_type: examType, component_type: componentType });
      }
    },
    [moduleId, upsert, remove]
  );

  const handleLevelChange = useCallback(
    (chapterId: string, examType: string, componentType: string, level: string) => {
      upsert.mutate({
        module_id: moduleId,
        chapter_id: chapterId,
        exam_type: examType,
        component_type: componentType,
        inclusion_level: level,
      });
    },
    [moduleId, upsert]
  );

  if (chaptersLoading || configsLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const allChapters = [...crossChapters, ...ownChapters];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p>Define each chapter's profile: which exam types it belongs to, which component types it can appear in, and its inclusion level (High / Average / Low).</p>
          <p className="text-xs italic mt-1">This becomes the primary source of truth for all exam generation logic.</p>
        </div>
      </div>

      {allChapters.map((chapter, idx) => {
        const isCross = chapter.module_id === CROSS_MODULE_SOURCE;
        const showCrossDivider = isCross && idx === 0;
        const showOwnDivider = !isCross && idx === crossChapters.length && crossChapters.length > 0;

        return (
          <div key={chapter.id}>
            {showCrossDivider && (
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1">
                From General Surgery Book
              </div>
            )}
            {showOwnDivider && (
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1 mt-4">
                Module Chapters
              </div>
            )}
            <ChapterProfileCard
              chapter={chapter}
              getConfig={getConfig}
              onToggle={handleToggle}
              onLevelChange={handleLevelChange}
              canManage={canManage}
            />
          </div>
        );
      })}
    </div>
  );
}

function ChapterProfileCard({
  chapter,
  getConfig,
  onToggle,
  onLevelChange,
  canManage,
}: {
  chapter: { id: string; title: string; module_id: string };
  getConfig: (chapterId: string, examType: string, componentType: string) => ChapterBlueprintConfig | undefined;
  onToggle: (chapterId: string, examType: string, componentType: string, checked: boolean) => void;
  onLevelChange: (chapterId: string, examType: string, componentType: string, level: string) => void;
  canManage: boolean;
}) {
  const activeCount = EXAM_TYPES.reduce((acc, et) => {
    return acc + COMPONENT_TYPES.filter(ct => getConfig(chapter.id, et.key, ct.key)).length;
  }, 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
        <span className="font-medium text-sm">{chapter.title}</span>
        <Badge variant={activeCount > 0 ? 'default' : 'secondary'} className="text-xs">
          {activeCount} component{activeCount !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Exam Type</TableHead>
              {COMPONENT_TYPES.map(ct => (
                <TableHead key={ct.key} className="text-center min-w-[90px] text-xs">{ct.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {EXAM_TYPES.map(examType => (
              <TableRow key={examType.key}>
                <TableCell className="text-sm font-medium">{examType.label}</TableCell>
                {COMPONENT_TYPES.map(ct => {
                  const config = getConfig(chapter.id, examType.key, ct.key);
                  const isEnabled = !!config;
                  return (
                    <TableCell key={ct.key} className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={isEnabled}
                          onCheckedChange={(v) => onToggle(chapter.id, examType.key, ct.key, !!v)}
                          disabled={!canManage}
                        />
                        {isEnabled && (
                          <Select
                            value={config.inclusion_level}
                            onValueChange={(v) => onLevelChange(chapter.id, examType.key, ct.key, v)}
                            disabled={!canManage}
                          >
                            <SelectTrigger className="h-6 w-[70px] text-[10px] px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INCLUSION_LEVELS.map(level => (
                                <SelectItem key={level} value={level} className="text-xs capitalize">{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
