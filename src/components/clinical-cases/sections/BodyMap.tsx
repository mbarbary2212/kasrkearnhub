import { cn } from '@/lib/utils';

interface BodyMapProps {
  regions: Record<string, { label: string; finding: string }>;
  revealedRegions: Set<string>;
  selectedRegion: string | null;
  onRegionClick: (key: string) => void;
}

// Map region keys to body positions. Keys are matched via substring.
const HOTSPOT_POSITIONS: { match: string[]; x: number; y: number; labelX: number; labelY: number; side: 'left' | 'right' }[] = [
  { match: ['neuro', 'nervous', 'cns', 'mental', 'gcs', 'consciousness'], x: 150, y: 45, labelX: 260, labelY: 40, side: 'right' },
  { match: ['head', 'heent', 'ent', 'ear', 'eye', 'throat', 'neck', 'face', 'mouth', 'oral'], x: 150, y: 70, labelX: 30, labelY: 70, side: 'left' },
  { match: ['vital', 'vitals', 'bp', 'pulse', 'temp', 'spo2', 'respiratory_rate', 'heart_rate'], x: 150, y: 15, labelX: 30, labelY: 15, side: 'left' },
  { match: ['cardio', 'cardiac', 'heart', 'cv', 'cardiovascular', 'chest'], x: 140, y: 140, labelX: 260, labelY: 120, side: 'right' },
  { match: ['pulm', 'lung', 'respiratory', 'breath', 'auscultation'], x: 160, y: 130, labelX: 260, labelY: 150, side: 'right' },
  { match: ['abdo', 'abdomen', 'stomach', 'gi', 'gastro', 'liver', 'spleen', 'bowel'], x: 150, y: 195, labelX: 30, labelY: 195, side: 'left' },
  { match: ['pelv', 'groin', 'genital', 'urogenital', 'gu', 'renal', 'kidney'], x: 150, y: 240, labelX: 260, labelY: 240, side: 'right' },
  { match: ['upper_limb', 'arm', 'hand', 'shoulder', 'elbow', 'wrist', 'upper_ext', 'upper extremit'], x: 100, y: 180, labelX: 30, labelY: 145, side: 'left' },
  { match: ['lower_limb', 'leg', 'foot', 'knee', 'ankle', 'hip', 'lower_ext', 'lower extremit'], x: 135, y: 320, labelX: 30, labelY: 320, side: 'left' },
  { match: ['skin', 'integument', 'derma', 'rash', 'wound'], x: 200, y: 180, labelX: 260, labelY: 195, side: 'right' },
  { match: ['back', 'spine', 'spinal', 'vertebr', 'musculoskeletal', 'msk'], x: 150, y: 165, labelX: 260, labelY: 170, side: 'right' },
];

function matchRegionToPosition(key: string, label: string) {
  const search = `${key} ${label}`.toLowerCase();
  return HOTSPOT_POSITIONS.find(h => h.match.some(m => search.includes(m)));
}

export function BodyMap({ regions, revealedRegions, selectedRegion, onRegionClick }: BodyMapProps) {
  const entries = Object.entries(regions);

  // Build positioned + unmatched lists
  const positioned: { key: string; label: string; pos: typeof HOTSPOT_POSITIONS[0] }[] = [];
  const unmatched: { key: string; label: string }[] = [];
  const usedPositions = new Set<number>();

  entries.forEach(([key, region]) => {
    const pos = matchRegionToPosition(key, region.label);
    if (pos) {
      const idx = HOTSPOT_POSITIONS.indexOf(pos);
      if (!usedPositions.has(idx)) {
        usedPositions.add(idx);
        positioned.push({ key, label: region.label, pos });
      } else {
        unmatched.push({ key, label: region.label });
      }
    } else {
      unmatched.push({ key, label: region.label });
    }
  });

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG Body */}
      <svg viewBox="0 0 300 420" className="w-full max-w-[280px]" xmlns="http://www.w3.org/2000/svg">
        {/* Body silhouette */}
        <g opacity="0.15" fill="hsl(var(--foreground))">
          {/* Head */}
          <ellipse cx="150" cy="50" rx="28" ry="32" />
          {/* Neck */}
          <rect x="140" y="78" width="20" height="18" rx="4" />
          {/* Torso */}
          <path d="M110 96 C105 96 95 110 92 130 L88 200 C88 215 95 240 110 245 L130 250 L170 250 L190 245 C205 240 212 215 212 200 L208 130 C205 110 195 96 190 96 Z" />
          {/* Left arm */}
          <path d="M92 105 C80 110 65 135 58 165 L50 200 C48 210 52 215 58 212 L72 195 C78 175 82 155 88 135 Z" />
          {/* Right arm */}
          <path d="M208 105 C220 110 235 135 242 165 L250 200 C252 210 248 215 242 212 L228 195 C222 175 218 155 212 135 Z" />
          {/* Left leg */}
          <path d="M115 248 L108 310 L105 370 L100 405 C99 412 106 415 110 412 L118 405 L122 370 L128 310 L135 255 Z" />
          {/* Right leg */}
          <path d="M185 248 L192 310 L195 370 L200 405 C201 412 194 415 190 412 L182 405 L178 370 L172 310 L165 255 Z" />
        </g>

        {/* Organ hints */}
        <g opacity="0.08" fill="hsl(var(--primary))">
          {/* Lungs */}
          <ellipse cx="125" cy="135" rx="18" ry="28" />
          <ellipse cx="175" cy="135" rx="18" ry="28" />
          {/* Heart */}
          <ellipse cx="155" cy="145" rx="12" ry="14" />
          {/* Stomach area */}
          <ellipse cx="160" cy="195" rx="22" ry="18" />
          {/* Brain */}
          <ellipse cx="150" cy="45" rx="20" ry="22" />
        </g>

        {/* Hotspot dots and labels */}
        {positioned.map(({ key, label, pos }) => {
          const revealed = revealedRegions.has(key);
          const selected = selectedRegion === key;
          return (
            <g key={key} onClick={() => onRegionClick(key)} className="cursor-pointer">
              {/* Connector line */}
              <line
                x1={pos.x} y1={pos.y}
                x2={pos.labelX + (pos.side === 'left' ? 65 : -5)} y2={pos.labelY + 6}
                stroke={revealed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                strokeWidth="0.8"
                strokeDasharray={revealed ? 'none' : '3 2'}
                opacity={0.5}
              />
              {/* Dot on body */}
              <circle
                cx={pos.x} cy={pos.y} r={selected ? 7 : 5}
                fill={revealed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                opacity={revealed ? 0.9 : 0.4}
                className="transition-all duration-200"
              />
              {selected && (
                <circle
                  cx={pos.x} cy={pos.y} r={10}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  opacity={0.5}
                />
              )}
              {/* Label */}
              <text
                x={pos.labelX}
                y={pos.labelY + 10}
                fontSize="10"
                fill={revealed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                fontWeight={selected ? 600 : 400}
                className="select-none"
              >
                {label.length > 18 ? label.slice(0, 16) + '…' : label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Unmatched regions as clickable badges below */}
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
