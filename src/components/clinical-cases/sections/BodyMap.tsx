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
        viewBox="0 -55 310 560"
        className="w-full"
        style={{ overflow: 'hidden', display: 'block', height: 'auto', flex: '1 1 auto', maxHeight: '620px' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body image */}
        <image
          href={bodyFigure}
          x="-40" y="-45" width="390" height="540"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* ── GENERAL APPEARANCE pill ── */}
        {findings.general && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('general')}>
            <rect
              x={30} y={-50} width={250} height={34} rx={17}
              fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
            />
            <text
              x={155} y={-27} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              General Appearance
            </text>
            <line x1={155} y1={-16} x2={155} y2={-3} stroke={LABEL_BORDER} strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
            <polygon points="151,-4 155,4 159,-4" fill={LABEL_BORDER} opacity={0.5} />
          </g>
        )}

        {/* ── HEAD / NECK — left inside ── */}
        {findings.head_neck && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('head_neck')}>
            <rect x={110} y={5} width={90} height={140} rx={6} fill="transparent" />
            <rect x={10} y={50} width={110} height={32} rx={6} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
            <text
              x={65} y={72} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Head / Neck
            </text>
          </g>
        )}

        {/* ── CHEST box on body ── */}
        {findings.chest && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('chest')}>
            <rect
              x={105} y={96} width={100} height={38} rx={5}
              fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
            />
            <text
              x={155} y={121} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '16px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Chest
            </text>
            <rect x={88} y={88} width={134} height={80} rx={6} fill="transparent" />
          </g>
        )}

        {/* ── UPPER LIMB — left inside ── */}
        {findings.upper_limbs && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('upper_limbs')}>
            <rect x={8} y={138} width={72} height={205} rx={6} fill="transparent" />
            <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
            <rect x={10} y={148} width={110} height={32} rx={6} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
            <text
              x={65} y={170} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Upper limb
            </text>
          </g>
        )}

        {/* ── VITALS — right inside ── */}
        {findings.vital_signs && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('vital_signs')}>
            <rect
              x={230} y={138} width={72} height={205} rx={6}
              fill="rgba(0,180,220,0.08)" stroke="rgba(0,180,220,0.2)"
              strokeWidth={1.2} pointerEvents="none"
            />
            <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
            <rect x={195} y={148} width={110} height={32} rx={6} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
            <text
              x={250} y={170} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Vitals
            </text>
          </g>
        )}

        {/* ── ABDOMEN box ── */}
        {findings.abdomen && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('abdomen')}>
            <rect
              x={105} y={186} width={100} height={36} rx={5}
              fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
            />
            <text
              x={155} y={210} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '16px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Abdomen
            </text>
            <rect x={88} y={178} width={134} height={80} rx={6} fill="transparent" />
          </g>
        )}

        {/* ── LOWER LIMB — left inside ── */}
        {findings.lower_limbs && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('lower_limbs')}>
            <rect x={88} y={325} width={134} height={124} rx={6} fill="transparent" />
            <rect x={10} y={290} width={110} height={32} rx={6} fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW} />
            <text
              x={65} y={312} textAnchor="middle"
              style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
            >
              Lower limb
            </text>
          </g>
        )}

        {/* ── MISC dashed pill — right inside ── */}
        <g style={{ cursor: hasExtra ? 'pointer' : 'default', opacity: hasExtra ? 1 : 0.5 }} onClick={() => hasExtra && onRegionClick('extra')}>
          <rect
            x={195} y={290} width={110} height={32} rx={16}
            fill={LABEL_BG} stroke={LABEL_BORDER} strokeWidth={LABEL_SW}
            strokeDasharray="5,3"
          />
          <text
            x={250} y={312} textAnchor="middle"
            style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, fill: LABEL_TEXT, pointerEvents: 'none' }}
          >
            {extraLabel}
          </text>
          <rect x={191} y={286} width={118} height={40} rx={16} fill="transparent" />
        </g>
      </svg>
    </div>
  );
}
