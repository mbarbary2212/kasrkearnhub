import { useState, useMemo, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PhysicalExamSectionData,
  RegionKey,
  ExamFindingValue,
  VitalsFinding,
  ExtraFinding,
  TopicItem,
} from '@/types/structuredCase';
import { SectionComponentProps } from './types';
import { BodyMap } from './BodyMap';

const REGION_LABELS: Record<RegionKey, { icon: string; label: string }> = {
  general: { icon: '🧍', label: 'General Appearance' },
  head_neck: { icon: '👁', label: 'Head & Neck' },
  vital_signs: { icon: '❤️', label: 'Vital Signs' },
  chest: { icon: '🫁', label: 'Chest & Cardiovascular' },
  upper_limbs: { icon: '🤲', label: 'Upper Limbs' },
  abdomen: { icon: '🔬', label: 'Abdomen' },
  lower_limbs: { icon: '🦵', label: 'Lower Limbs' },
  extra: { icon: '📍', label: 'Misc' },
};

const REGION_ORDER: RegionKey[] = [
  'general', 'head_neck', 'vital_signs', 'chest', 'upper_limbs', 'abdomen', 'lower_limbs', 'extra',
];

function isVitalsFinding(f: ExamFindingValue): f is VitalsFinding {
  return 'vitals' in f && Array.isArray((f as VitalsFinding).vitals);
}

function isExtraFinding(f: ExamFindingValue): f is ExtraFinding {
  return 'label' in f;
}

export function PhysicalExamSection({
  data,
  onSubmit,
  isSubmitting,
  readOnly,
  previousAnswer,
}: SectionComponentProps<PhysicalExamSectionData>) {
  // Backward compatibility: convert old `regions` format to new `findings` format
  const findings = useMemo(() => {
    if (data.findings && Object.keys(data.findings).length > 0) return data.findings;
    // Legacy format: data.regions = Record<string, { finding: string; label: string; ... }>
    const legacyRegions = (data as any).regions as Record<string, any> | undefined;
    if (!legacyRegions) return {};

    // Map legacy arbitrary keys → fixed RegionKey
    function mapLegacyKey(key: string): RegionKey {
      const k = key.toLowerCase();
      if (k === 'general' || k === 'general_appearance') return 'general';
      if (k === 'vital_signs' || k === 'vitals') return 'vital_signs';
      if (k.includes('abdomen') || k.includes('abdominal')) return 'abdomen';
      if (k.includes('head') || k.includes('neck') || k.includes('cranial')) return 'head_neck';
      if (k.includes('chest') || k.includes('cardio') || k.includes('respiratory') || k.includes('lung')) return 'chest';
      if (k.includes('upper') || k.includes('arm') || k.includes('hand')) return 'upper_limbs';
      if (k.includes('lower') || k.includes('leg') || k.includes('foot') || k.includes('feet')) return 'lower_limbs';
      // Everything else → extra
      return 'extra';
    }

    const converted: Partial<Record<RegionKey, any>> = {};
    for (const [key, val] of Object.entries(legacyRegions)) {
      const regionKey = mapLegacyKey(key);
      const text = val.finding || val.text || '';
      let label = val.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (regionKey === 'extra' && label.toLowerCase().includes('wound')) label = 'Wound';

      if (converted[regionKey]) {
        // Merge into existing region (e.g. abdomen_inspection + abdomen_palpation)
        const existing = converted[regionKey];
        existing.text = [existing.text, `**${label}:** ${text}`].filter(Boolean).join('\n\n');
        if (val.ref && !existing.ref) existing.ref = val.ref;
      } else {
        converted[regionKey] = {
          text: text,
          ref: val.ref || null,
          ...(regionKey === 'extra' ? { label } : {}),
          ...(val.vitals ? { vitals: val.vitals } : {}),
        };
      }
    }
    return converted;
  }, [data]);
  const topics = data.related_topics || [];

  const [revealedRegions, setRevealedRegions] = useState<Set<RegionKey>>(
    new Set((previousAnswer?.revealed_regions as RegionKey[]) || [])
  );
  const isMobile = useIsMobile();
  const [openRegion, setOpenRegion] = useState<RegionKey | null>(null);
  const [findingsSummary, setFindingsSummary] = useState(
    (previousAnswer?.findings_summary as string) || ''
  );
  const [topicModal, setTopicModal] = useState<TopicItem | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeRegions = useMemo(
    () => REGION_ORDER.filter(k => !!findings[k]),
    [findings]
  );

  const revealedCount = useMemo(
    () => activeRegions.filter(k => revealedRegions.has(k)).length,
    [activeRegions, revealedRegions]
  );

  const handleTap = useCallback((regionKey: RegionKey) => {
    if (readOnly) return;
    if (!findings[regionKey]) return;

    // Reveal
    setRevealedRegions(prev => {
      const next = new Set(prev);
      next.add(regionKey);
      return next;
    });

    if (openRegion === regionKey) {
      // Second tap — collapse to done
      setOpenRegion(null);
    } else {
      setOpenRegion(regionKey);
      // Scroll card into view
      setTimeout(() => {
        cardRefs.current[regionKey]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [readOnly, findings, openRegion]);

  const handleSubmit = () => {
    onSubmit({
      revealed_regions: Array.from(revealedRegions),
      findings_summary: findingsSummary.trim(),
      regions_examined: revealedRegions.size,
      total_regions: activeRegions.length,
    });
  };

  return (
    <div className="space-y-0">
      {/* ── Header (no title — parent card already shows it) ── */}
      <div
        className="flex items-center justify-between px-6 py-3 rounded-t-lg"
        style={{ background: 'linear-gradient(135deg, #0d3f4f 0%, #1a7a8a 100%)' }}
      >
        <p className="text-white/80 text-xs">
          Click any region to reveal findings ·{' '}
          <button
            type="button"
            className="text-white font-semibold underline underline-offset-2 hover:text-white/90"
            onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            Write a summary to score
          </button>
        </p>
        <div
          className="text-xs font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap"
          style={{
            background: 'rgba(255,255,255,0.13)',
            border: '1px solid rgba(255,255,255,0.22)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {revealedCount} of {activeRegions.length} examined
        </div>
      </div>

      {/* ── Two-panel layout (vertical on mobile) ── */}
      <div className={cn(
        'border border-t-0 rounded-b-lg overflow-hidden',
        isMobile ? 'flex flex-col' : 'flex min-h-[420px]'
      )}>
        {/* Left/Top: Figure panel */}
        <div
          className={cn(
            'shrink-0 flex flex-col items-center overflow-hidden',
            isMobile ? 'w-full' : 'w-[320px]'
          )}
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, #1b5a7a 0%, #0f3a54 40%, #0a2438 70%, #071a2b 100%)',
          }}
        >
          <BodyMap
            findings={findings}
            revealedRegions={revealedRegions}
            selectedRegion={openRegion}
            onRegionClick={handleTap}
          />
        </div>

        {/* Right: Findings panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between px-6 pt-4 pb-1.5">
            <h3 className="text-sm font-bold text-foreground">Examination Findings</h3>
            <div className="text-[11px] font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {revealedCount} of {activeRegions.length} examined
            </div>
          </div>

          {/* Hint */}
          {revealedCount === 0 && (
            <div className="mx-6 my-1 px-3.5 py-2.5 bg-muted/50 border border-dashed border-border rounded-lg text-xs text-muted-foreground text-center">
              👆 Click any region on the figure or a card below to reveal findings
            </div>
          )}

          {/* Cards area */}
          <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-1.5">
            {activeRegions.map(regionKey => {
              const finding = findings[regionKey]!;
              const isOpen = openRegion === regionKey;
              const isDone = revealedRegions.has(regionKey);
              const meta = REGION_LABELS[regionKey];
              const displayLabel = regionKey === 'extra' && isExtraFinding(finding)
                ? finding.label
                : meta.label;

              return (
                <div
                  key={regionKey}
                  ref={el => { cardRefs.current[regionKey] = el; }}
                  className={cn(
                    'border rounded-xl overflow-hidden cursor-pointer transition-all duration-150',
                    isOpen
                      ? 'border-[#1a7a8a] shadow-md'
                      : isDone
                        ? 'border-[#10b981]'
                        : 'border-l-[3px] border-l-[#1a5568] border-border hover:border-[#1a7a8a] hover:shadow-sm'
                  )}
                  onClick={() => handleTap(regionKey)}
                >
                  {/* Card head */}
                  <div
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-2.5',
                      isOpen
                        ? 'bg-[#e4f2f5]'
                        : isDone
                          ? 'bg-[#f0fdf4]'
                          : 'bg-muted/50'
                    )}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{
                        background: isOpen ? '#1a7a8a' : isDone ? '#10b981' : '#1a5568',
                        color: 'white',
                      }}
                    >
                      {(isOpen || isDone) ? '✓' : meta.icon}
                    </div>
                    <span
                      className={cn(
                        'flex-1 text-xs font-bold',
                        isOpen ? 'text-[#0f5c6a]' : isDone ? 'text-[#059669]' : 'text-foreground'
                      )}
                    >
                      {displayLabel}
                    </span>
                    <span
                      className={cn(
                        'text-[10.5px] font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap',
                        isOpen
                          ? 'bg-[#cceaee] text-[#0f5c6a]'
                          : isDone
                            ? 'bg-[#d1fae5] text-[#059669]'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isOpen ? 'Examining…' : isDone ? 'Examined ✓' : 'Tap to examine'}
                    </span>
                  </div>

                  {/* Card body */}
                  {isOpen && (
                    <div
                      className="px-4 py-3 text-sm leading-relaxed border-t border-border"
                      style={{ color: '#3d5166' }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Vitals grid */}
                      {regionKey === 'vital_signs' && isVitalsFinding(finding) && (
                        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                          {finding.vitals.map((v, i) => (
                            <div
                              key={i}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5',
                                v.abnormal ? 'bg-red-50' : 'bg-muted/60'
                              )}
                            >
                              <span className="block text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide">
                                {v.name}
                              </span>
                              <span
                                className={cn(
                                  'block text-sm font-bold',
                                  v.abnormal ? 'text-red-600' : 'text-[#0f5c6a]'
                                )}
                              >
                                {v.value}
                              </span>
                              <span className="block text-[9px] text-muted-foreground">{v.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Finding text */}
                      {finding.text && <p className="whitespace-pre-line text-left">{finding.text}</p>}

                      {/* Chapter ref callout */}
                      {finding.ref && (
                        <div
                          className="mt-2.5 px-3 py-2 rounded-r-lg text-xs italic leading-relaxed"
                          style={{
                            background: '#fffbeb',
                            borderLeft: '3px solid #f59e0b',
                            color: '#92400e',
                          }}
                        >
                          {finding.ref}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Topic strip */}
          {topics.length > 0 && (
            <div className="border-t px-6 py-3" style={{ background: '#f7fafd' }}>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Related Topics from Chapter
              </div>
              <div className="flex flex-wrap gap-1.5">
                {topics.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTopicModal(t)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5',
                      topicModal?.key === t.key
                        ? 'border-[#1a7a8a] text-white bg-[#1a7a8a]'
                        : 'border-border text-foreground bg-background hover:border-[#1a7a8a] hover:text-[#1a7a8a] hover:bg-[#eef8fa]'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-55" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Findings summary textarea (our scoring addition) ── */}
      {revealedCount > 0 && (
        <div className="mt-4">
          <Label className="font-medium text-sm">Summarize your key examination findings</Label>
          <Textarea
            value={findingsSummary}
            onChange={e => setFindingsSummary(e.target.value)}
            rows={4}
            className="mt-1"
            disabled={readOnly}
            placeholder="Summarize your key examination findings... (type 'pass' to skip)"
          />
        </div>
      )}

      {!readOnly && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || revealedCount === 0 || !findingsSummary.trim()}
          className="w-full mt-3"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit Examination ({revealedCount}/{activeRegions.length} regions)
        </Button>
      )}

      {/* ── Topic Modal ── */}
      {topicModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ background: 'rgba(13,40,55,0.5)' }}
          onClick={() => setTopicModal(null)}
        >
          <div
            className="bg-background rounded-2xl max-w-[480px] w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #0d3f4f, #1a7a8a)' }}
            >
              <div>
                <div className="text-white text-base font-semibold">{topicModal.title}</div>
                <div className="text-white/60 text-[11px] mt-0.5">{topicModal.chapter}</div>
              </div>
              <button
                onClick={() => setTopicModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 text-sm leading-relaxed" style={{ color: '#3d5166' }}>
              {topicModal.body}
            </div>
            <div
              className="mx-5 mb-5 px-3.5 py-2.5 rounded-r-lg text-xs italic leading-relaxed"
              style={{
                background: '#fffbeb',
                borderLeft: '3px solid #f59e0b',
                color: '#92400e',
              }}
            >
              {topicModal.quote}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
