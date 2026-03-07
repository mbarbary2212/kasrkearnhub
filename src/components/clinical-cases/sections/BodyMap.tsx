import { useMemo } from 'react';
import bodyFigure from '@/assets/body-figure.jpg';
import type { RegionKey, ExamFindingValue } from '@/types/structuredCase';

interface BodyMapProps {
  findings: Partial<Record<RegionKey, ExamFindingValue>>;
  revealedRegions: Set<RegionKey>;
  selectedRegion: RegionKey | null;
  onRegionClick: (key: RegionKey) => void;
}

interface RegionDef {
  key: RegionKey;
  type: 'pill' | 'label' | 'box' | 'misc';
}

const REGION_ORDER: RegionDef[] = [
  { key: 'general', type: 'pill' },
  { key: 'head_neck', type: 'label' },
  { key: 'chest', type: 'box' },
  { key: 'upper_limbs', type: 'label' },
  { key: 'vital_signs', type: 'label' },
  { key: 'abdomen', type: 'box' },
  { key: 'lower_limbs', type: 'label' },
  { key: 'extra', type: 'misc' },
];

// Uniform styling constants
const LABEL_BG = 'rgba(10, 32, 48, 0.85)';
const LABEL_BORDER = 'rgba(91, 184, 204, 0.5)';
const LABEL_TEXT = '#ffffff';
const LABEL_SW = 1.5;

export function BodyMap({ findings, revealedRegions, selectedRegion, onRegionClick }: BodyMapProps) {
  const activeRegions = useMemo(() => REGION_ORDER.filter(r => !!findings[r.key]), [findings]);

  const extraFinding = findings.extra;
  const extraLabel = extraFinding && 'label' in extraFinding ? extraFinding.label : 'Misc';
  const hasExtra = !!findings.extra;

  return (
    <div className="flex flex-col items-center w-full h-full justify-center" style={{ padding: '4px 0 4px' }}>
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: '#5bb8cc' }}
      >
        Select Region
      </div>

      <svg
        viewBox="0 -55 310 580"
        className="w-full"
        style={{ overflow: 'visible', display: 'block', height: 'auto', flex: '1 1 auto', maxHeight: '500px' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body image */}
        <image
          href={bodyFigure}
          x="-40" y="-45" width="390" height="540"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* ── GENERAL APPEARANCE pill ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.general && onRegionClick('general')}>
          <rect
            x={55} y={-48} width={200} height={28} rx={14}
            fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
          />
          <text
            x={155} y={-29} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            General Appearance
          </text>
          <line x1={155} y1={-20} x2={155} y2={-3} stroke={LABEL_BORDER} strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
          <polygon points="151,-4 155,4 159,-4" fill={LABEL_BORDER} opacity={0.5} />
        </g>

        {/* ── HEAD / NECK — left inside ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.head_neck && onRegionClick('head_neck')}>
          <rect x={110} y={5} width={90} height={140} rx={6} fill="transparent" />
          <rect x={15} y={52} width={95} height={28} rx={14} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
          <text
            x={62} y={71} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Head / Neck
          </text>
        </g>

        {/* ── CHEST pill on body ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.chest && onRegionClick('chest')}>
          <rect
            x={128} y={100} width={74} height={28} rx={14}
            fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
          />
          <text
            x={165} y={119} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Chest
          </text>
          <rect x={88} y={88} width={134} height={80} rx={6} fill="transparent" />
        </g>

        {/* ── UPPER LIMB — left inside ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.upper_limbs && onRegionClick('upper_limbs')}>
          <rect x={8} y={138} width={72} height={205} rx={6} fill="transparent" />
          <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
          <rect x={15} y={150} width={95} height={28} rx={14} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
          <text
            x={62} y={169} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Upper limb
          </text>
        </g>

        {/* ── VITALS — right inside ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.vital_signs && onRegionClick('vital_signs')}>
          <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
          <rect x={220} y={150} width={75} height={28} rx={14} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
          <text
            x={257} y={169} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Vitals
          </text>
        </g>

        {/* ── ABDOMEN pill (centered on body) ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.abdomen && onRegionClick('abdomen')}>
          <rect
            x={112} y={195} width={86} height={28} rx={14}
            fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
          />
          <text
            x={155} y={214} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Abdomen
          </text>
          <rect x={88} y={183} width={134} height={80} rx={6} fill="transparent" />
        </g>

        {/* ── LOWER LIMB — left inside ── */}
        <g style={{ cursor: 'pointer' }} onClick={() => findings.lower_limbs && onRegionClick('lower_limbs')}>
          <rect x={88} y={325} width={134} height={160} rx={6} fill="transparent" />
          <rect x={15} y={340} width={95} height={28} rx={14} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
          <text
            x={62} y={359} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            Lower limb
          </text>
        </g>

        {/* ── MISC dashed pill — right inside ── */}
        <g style={{ cursor: hasExtra ? 'pointer' : 'default', opacity: hasExtra ? 1 : 0.5 }} onClick={() => hasExtra && onRegionClick('extra')}>
          <rect
            x={220} y={340} width={75} height={28} rx={14}
            fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
            strokeDasharray="5,3"
          />
          <text
            x={257} y={359} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            {extraLabel}
          </text>
          <rect x={216} y={336} width={83} height={36} rx={14} fill="transparent" />
        </g>
      </svg>
    </div>
  );
}
