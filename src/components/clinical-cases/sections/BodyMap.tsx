import { cn } from '@/lib/utils';

interface BodyMapProps {
  regions: Record<string, { label: string; finding: string }>;
  revealedRegions: Set<string>;
  selectedRegion: string | null;
  onRegionClick: (key: string) => void;
}

// Zone definitions with colors and SVG positions
interface ZoneDef {
  id: string;
  match: string[];
  color: string;         // HSL color for the zone
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
  dotX: number;
  dotY: number;
}

const ZONES: ZoneDef[] = [
  {
    id: 'general',
    match: ['general', 'appearance', 'gcs', 'consciousness', 'mental'],
    color: '220 80% 65%',
    labelX: 30, labelY: 20, side: 'left',
    dotX: 150, dotY: 30,
  },
  {
    id: 'head_neck',
    match: ['head', 'heent', 'ent', 'ear', 'eye', 'throat', 'neck', 'face', 'mouth', 'oral', 'thyroid', 'lymph'],
    color: '210 90% 65%',
    labelX: 30, labelY: 55, side: 'left',
    dotX: 150, dotY: 55,
  },
  {
    id: 'neuro',
    match: ['neuro', 'nervous', 'cns', 'cranial', 'reflex', 'sensory', 'motor', 'cerebell'],
    color: '270 70% 65%',
    labelX: 260, labelY: 40, side: 'right',
    dotX: 150, dotY: 45,
  },
  {
    id: 'chest',
    match: ['cardio', 'cardiac', 'heart', 'cv', 'cardiovascular', 'chest', 'pulm', 'lung', 'respiratory', 'breath', 'auscultation'],
    color: '170 70% 55%',
    labelX: 260, labelY: 130, side: 'right',
    dotX: 150, dotY: 135,
  },
  {
    id: 'abdomen',
    match: ['abdo', 'abdomen', 'stomach', 'gi', 'gastro', 'liver', 'spleen', 'bowel', 'inspect', 'palp', 'percus', 'auscult', 'special_test', 'rebound', 'guarding', 'murphy', 'rovsing', 'mcburney'],
    color: '140 65% 55%',
    labelX: 30, labelY: 195, side: 'left',
    dotX: 150, dotY: 200,
  },
  {
    id: 'pelvis',
    match: ['pelv', 'groin', 'genital', 'urogenital', 'gu', 'renal', 'kidney', 'bladder', 'rectal', 'pr_exam'],
    color: '330 70% 65%',
    labelX: 260, labelY: 240, side: 'right',
    dotX: 150, dotY: 245,
  },
  {
    id: 'vitals',
    match: ['vital', 'vitals', 'bp', 'pulse', 'temp', 'spo2', 'respiratory_rate', 'heart_rate', 'blood_pressure', 'temperature'],
    color: '280 65% 60%',
    labelX: 30, labelY: 145, side: 'left',
    dotX: 85, dotY: 165,
  },
  {
    id: 'upper_limb',
    match: ['upper_limb', 'arm', 'hand', 'shoulder', 'elbow', 'wrist', 'upper_ext', 'upper extremit'],
    color: '260 60% 65%',
    labelX: 260, labelY: 180, side: 'right',
    dotX: 215, dotY: 175,
  },
  {
    id: 'lower_limb',
    match: ['lower_limb', 'leg', 'foot', 'knee', 'ankle', 'hip', 'lower_ext', 'lower extremit', 'gait'],
    color: '30 75% 60%',
    labelX: 30, labelY: 330, side: 'left',
    dotX: 130, dotY: 330,
  },
  {
    id: 'skin',
    match: ['skin', 'integument', 'derma', 'rash', 'wound', 'scar', 'lesion', 'bruise', 'laceration'],
    color: '350 65% 60%',
    labelX: 260, labelY: 290, side: 'right',
    dotX: 200, dotY: 290,
  },
  {
    id: 'back',
    match: ['back', 'spine', 'spinal', 'vertebr', 'musculoskeletal', 'msk', 'costovertebral'],
    color: '45 70% 55%',
    labelX: 260, labelY: 170, side: 'right',
    dotX: 150, dotY: 168,
  },
];

function matchRegionToZone(key: string, label: string): ZoneDef | undefined {
  const search = `${key} ${label}`.toLowerCase();
  return ZONES.find(z => z.match.some(m => search.includes(m)));
}

// Group region keys by zone (supports abdomen consolidation)
function groupByZone(regions: Record<string, { label: string; finding: string }>) {
  const zoneMap = new Map<string, { zone: ZoneDef; keys: { key: string; label: string }[] }>();
  const unmatched: { key: string; label: string }[] = [];

  Object.entries(regions).forEach(([key, region]) => {
    const zone = matchRegionToZone(key, region.label);
    if (zone) {
      if (!zoneMap.has(zone.id)) {
        zoneMap.set(zone.id, { zone, keys: [] });
      }
      zoneMap.get(zone.id)!.keys.push({ key, label: region.label });
    } else {
      unmatched.push({ key, label: region.label });
    }
  });

  return { zoneMap, unmatched };
}

export function BodyMap({ regions, revealedRegions, selectedRegion, onRegionClick }: BodyMapProps) {
  const { zoneMap, unmatched } = groupByZone(regions);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 300 420" className="w-full max-w-[280px]" xmlns="http://www.w3.org/2000/svg">
        {/* ── Colored body zones ── */}
        {/* Head */}
        <ellipse cx="150" cy="50" rx="28" ry="32"
          fill={zoneMap.has('head_neck') ? `hsla(${ZONES[1].color} / 0.18)` : 'hsla(var(--foreground) / 0.06)'}
          stroke={zoneMap.has('head_neck') ? `hsl(${ZONES[1].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Neck */}
        <rect x="140" y="78" width="20" height="18" rx="4"
          fill={zoneMap.has('head_neck') ? `hsla(${ZONES[1].color} / 0.12)` : 'hsla(var(--foreground) / 0.04)'}
          stroke="none" />
        {/* Torso / Chest zone */}
        <path d="M110 96 C105 96 95 110 92 130 L90 170 L95 170 L110 170 L190 170 L205 170 L210 170 L208 130 C205 110 195 96 190 96 Z"
          fill={zoneMap.has('chest') ? `hsla(${ZONES[3].color} / 0.18)` : 'hsla(var(--foreground) / 0.06)'}
          stroke={zoneMap.has('chest') ? `hsl(${ZONES[3].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Abdomen zone */}
        <path d="M90 170 L88 200 C88 215 95 240 110 245 L130 250 L170 250 L190 245 C205 240 212 215 212 200 L210 170 Z"
          fill={zoneMap.has('abdomen') ? `hsla(${ZONES[4].color} / 0.18)` : 'hsla(var(--foreground) / 0.06)'}
          stroke={zoneMap.has('abdomen') ? `hsl(${ZONES[4].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Left arm */}
        <path d="M92 105 C80 110 65 135 58 165 L50 200 C48 210 52 215 58 212 L72 195 C78 175 82 155 88 135 Z"
          fill={zoneMap.has('upper_limb') || zoneMap.has('vitals') ? `hsla(${ZONES[6].color} / 0.15)` : 'hsla(var(--foreground) / 0.05)'}
          stroke={zoneMap.has('vitals') ? `hsl(${ZONES[6].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Right arm */}
        <path d="M208 105 C220 110 235 135 242 165 L250 200 C252 210 248 215 242 212 L228 195 C222 175 218 155 212 135 Z"
          fill={zoneMap.has('upper_limb') ? `hsla(${ZONES[7].color} / 0.15)` : 'hsla(var(--foreground) / 0.05)'}
          stroke={zoneMap.has('upper_limb') ? `hsl(${ZONES[7].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Left leg */}
        <path d="M115 248 L108 310 L105 370 L100 405 C99 412 106 415 110 412 L118 405 L122 370 L128 310 L135 255 Z"
          fill={zoneMap.has('lower_limb') ? `hsla(${ZONES[8].color} / 0.18)` : 'hsla(var(--foreground) / 0.05)'}
          stroke={zoneMap.has('lower_limb') ? `hsl(${ZONES[8].color})` : 'transparent'}
          strokeWidth="1" />
        {/* Right leg */}
        <path d="M185 248 L192 310 L195 370 L200 405 C201 412 194 415 190 412 L182 405 L178 370 L172 310 L165 255 Z"
          fill={zoneMap.has('lower_limb') ? `hsla(${ZONES[8].color} / 0.18)` : 'hsla(var(--foreground) / 0.05)'}
          stroke={zoneMap.has('lower_limb') ? `hsl(${ZONES[8].color})` : 'transparent'}
          strokeWidth="1" />

        {/* ── Organ hints (subtle) ── */}
        <g opacity="0.06" fill="hsl(var(--primary))">
          <ellipse cx="125" cy="135" rx="18" ry="28" />
          <ellipse cx="175" cy="135" rx="18" ry="28" />
          <ellipse cx="155" cy="145" rx="12" ry="14" />
          <ellipse cx="160" cy="200" rx="22" ry="18" />
          <ellipse cx="150" cy="45" rx="20" ry="22" />
        </g>

        {/* ── Zone hotspots, connectors, labels ── */}
        {Array.from(zoneMap.entries()).map(([zoneId, { zone, keys }]) => {
          const anyRevealed = keys.some(k => revealedRegions.has(k.key));
          const anySelected = keys.some(k => selectedRegion === k.key);
          const revealedCount = keys.filter(k => revealedRegions.has(k.key)).length;
          // Display label: zone's first key label, or combine
          const displayLabel = keys.length === 1 ? keys[0].label : keys[0].label;
          const truncLabel = displayLabel.length > 18 ? displayLabel.slice(0, 16) + '…' : displayLabel;

          return (
            <g key={zoneId} onClick={() => {
              // If multiple keys in zone, cycle through unrevealed first, then revealed
              const unrevealed = keys.find(k => !revealedRegions.has(k.key));
              if (unrevealed) {
                onRegionClick(unrevealed.key);
              } else {
                // All revealed — select first or cycle
                const currentIdx = keys.findIndex(k => selectedRegion === k.key);
                const nextIdx = (currentIdx + 1) % keys.length;
                onRegionClick(keys[nextIdx].key);
              }
            }} className="cursor-pointer">
              {/* Connector line */}
              <line
                x1={zone.dotX} y1={zone.dotY}
                x2={zone.side === 'left' ? zone.labelX + 65 : zone.labelX - 5}
                y2={zone.labelY + 6}
                stroke={anyRevealed ? `hsl(${zone.color})` : 'hsl(var(--muted-foreground))'}
                strokeWidth="0.8"
                strokeDasharray={anyRevealed ? 'none' : '3 2'}
                opacity={0.5}
              />
              {/* Dot */}
              <circle
                cx={zone.dotX} cy={zone.dotY}
                r={anySelected ? 8 : 6}
                fill={anyRevealed ? `hsl(${zone.color})` : 'hsl(var(--muted-foreground))'}
                opacity={anyRevealed ? 0.85 : 0.35}
                className="transition-all duration-200"
              />
              {anySelected && (
                <circle
                  cx={zone.dotX} cy={zone.dotY} r={12}
                  fill="none"
                  stroke={`hsl(${zone.color})`}
                  strokeWidth="1.5"
                  opacity={0.5}
                />
              )}
              {/* Count badge for multi-key zones */}
              {keys.length > 1 && (
                <g>
                  <circle cx={zone.dotX + 8} cy={zone.dotY - 8} r={7}
                    fill={anyRevealed ? `hsl(${zone.color})` : 'hsl(var(--muted-foreground))'}
                    opacity={0.9} />
                  <text x={zone.dotX + 8} y={zone.dotY - 5}
                    fontSize="8" fill="white" textAnchor="middle" fontWeight="600">
                    {revealedCount}/{keys.length}
                  </text>
                </g>
              )}
              {/* Label */}
              <text
                x={zone.labelX}
                y={zone.labelY + 10}
                fontSize="10"
                fill={anyRevealed ? `hsl(${zone.color})` : 'hsl(var(--muted-foreground))'}
                fontWeight={anySelected ? 600 : 400}
                className="select-none"
              >
                {truncLabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Unmatched regions as badges */}
      {unmatched.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {unmatched.map(({ key, label }) => {
            const revealed = revealedRegions.has(key);
            const selected = selectedRegion === key;
            return (
              <button
                key={key}
                onClick={() => onRegionClick(key)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full border transition-all',
                  revealed
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30',
                  selected && 'ring-1 ring-primary/40'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
