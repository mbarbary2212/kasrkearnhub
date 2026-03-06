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

function getState(key: RegionKey, revealed: Set<RegionKey>, selected: RegionKey | null): 'default' | 'active' | 'done' {
  if (selected === key) return 'active';
  if (revealed.has(key)) return 'done';
  return 'default';
}

export function BodyMap({ findings, revealedRegions, selectedRegion, onRegionClick }: BodyMapProps) {
  const activeRegions = useMemo(() => REGION_ORDER.filter(r => !!findings[r.key]), [findings]);

  // Get extra label
  const extraFinding = findings.extra;
  const extraLabel = extraFinding && 'label' in extraFinding ? extraFinding.label : 'Misc';
  const hasExtra = !!findings.extra;

  return (
    <div className="flex flex-col items-center w-full h-full justify-center" style={{ padding: '12px 4px 10px' }}>
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: '#5bb8cc' }}
      >
        Select Region
      </div>

      <svg
        viewBox="-80 -65 470 580"
        className="w-full max-w-[340px]"
        style={{ overflow: 'visible', display: 'block', height: 'auto', flex: '1 1 auto' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body image — enlarged to fill the dark panel */}
        <image
          href={bodyFigure}
          x="-40" y="-45" width="390" height="540"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* ── GENERAL APPEARANCE pill ── */}
        {findings.general && (
          <GeneralPill
            state={getState('general', revealedRegions, selectedRegion)}
            onClick={() => onRegionClick('general')}
          />
        )}

        {/* ── HEAD / NECK — left label ── */}
        {findings.head_neck && (
          <SideLabel
            regionKey="head_neck"
            label="Head / Neck"
            state={getState('head_neck', revealedRegions, selectedRegion)}
            onClick={() => onRegionClick('head_neck')}
            labelX={48} labelY={66}
            hitBody={{ x: 110, y: 5, w: 90, h: 140 }}
            hitLabel={{ x: -78, y: 50, w: 130, h: 36 }}
            dotCx={198} dotCy={10}
          />
        )}

        {/* ── CHEST white box on body ── */}
        {findings.chest && (
          <BodyBox
            regionKey="chest"
            label="Chest"
            state={getState('chest', revealedRegions, selectedRegion)}
            onClick={() => onRegionClick('chest')}
            boxX={105} boxY={96} boxW={100} boxH={38}
            hitX={88} hitY={88} hitW={134} hitH={80}
            dotCx={207} dotCy={100}
          />
        )}

        {/* ── UPPER LIMB — left label ── */}
        {findings.upper_limbs && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('upper_limbs')}>
            {/* Left arm hit */}
            <rect x={8} y={138} width={72} height={205} rx={6} fill="transparent" />
            {/* Right arm hit */}
            <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
            <text
              x={48} y={152}
              textAnchor="end"
              style={{
                fontFamily: 'inherit', fontSize: '15px', fontWeight: 700,
                fill: getLabelColor(getState('upper_limbs', revealedRegions, selectedRegion)),
                cursor: 'pointer', transition: 'fill 0.15s',
              }}
            >
              Upper limb
            </text>
            <rect x={-78} y={136} width={130} height={36} rx={6} fill="transparent" />
            <RevealDot cx={8} cy={230} state={getState('upper_limbs', revealedRegions, selectedRegion)} />
          </g>
        )}

        {/* ── VITALS — right label ── */}
        {findings.vital_signs && (
          <g style={{ cursor: 'pointer' }} onClick={() => onRegionClick('vital_signs')}>
            {/* Right arm teal tint */}
            <rect
              x={230} y={138} width={72} height={205} rx={6}
              fill="rgba(0,180,220,0.08)" stroke="rgba(0,180,220,0.2)"
              strokeWidth={1.2} pointerEvents="none"
            />
            <rect x={230} y={138} width={72} height={205} rx={6} fill="transparent" />
            <text
              x={312} y={152}
              textAnchor="start"
              style={{
                fontFamily: 'inherit', fontSize: '15px', fontWeight: 700,
                fill: getLabelColor(getState('vital_signs', revealedRegions, selectedRegion)),
                cursor: 'pointer', transition: 'fill 0.15s',
              }}
            >
              Vitals
            </text>
            <rect x={308} y={136} width={80} height={36} rx={6} fill="transparent" />
            <RevealDot cx={384} cy={185} state={getState('vital_signs', revealedRegions, selectedRegion)} />
          </g>
        )}

        {/* ── ABDOMEN white box ── */}
        {findings.abdomen && (
          <BodyBox
            regionKey="abdomen"
            label="Abdomen"
            state={getState('abdomen', revealedRegions, selectedRegion)}
            onClick={() => onRegionClick('abdomen')}
            boxX={105} boxY={186} boxW={100} boxH={36}
            hitX={88} hitY={178} hitW={134} hitH={80}
            dotCx={207} dotCy={190}
          />
        )}

        {/* ── LOWER LIMB — left label ── */}
        {findings.lower_limbs && (
          <SideLabel
            regionKey="lower_limbs"
            label="Lower limb"
            state={getState('lower_limbs', revealedRegions, selectedRegion)}
            onClick={() => onRegionClick('lower_limbs')}
            labelX={48} labelY={296}
            hitBody={{ x: 88, y: 325, w: 134, h: 124 }}
            hitLabel={{ x: -78, y: 280, w: 130, h: 36 }}
            dotCx={8} dotCy={390}
          />
        )}

        {/* ── MISC dashed pill — always visible ── */}
        <MiscPill
          label={extraLabel}
          hasData={hasExtra}
          state={hasExtra ? getState('extra', revealedRegions, selectedRegion) : 'default'}
          onClick={() => hasExtra && onRegionClick('extra')}
        />
      </svg>

      {/* Legend */}
      <div
        className="flex gap-3.5 mt-2.5 pt-2 flex-wrap justify-center"
        style={{ borderTop: '1px solid #1a4a5a' }}
      >
        <LegendItem color="#2a6880" label="Not examined" />
        <LegendItem color="#00d2e6" label="Selected" />
        <LegendItem color="#10b981" label="Revealed" />
      </div>
    </div>
  );
}

/* ── Helpers ── */

function getLabelColor(state: 'default' | 'active' | 'done') {
  if (state === 'active') return '#00d2e6';
  if (state === 'done') return '#10b981';
  return '#ffffff';
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: '#5bb8cc' }}>
      <div className="w-[7px] h-[7px] rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function RevealDot({ cx, cy, state }: { cx: number; cy: number; state: string }) {
  return null;
}

/* ── General Appearance Pill ── */
function GeneralPill({ state, onClick }: { state: 'default' | 'active' | 'done'; onClick: () => void }) {
  const pillFill = state === 'active' ? 'rgba(0,210,230,0.36)'
    : state === 'done' ? 'rgba(16,185,129,0.28)'
    : 'rgba(26,122,138,0.35)';
  const pillStroke = state === 'active' ? '#00d2e6'
    : state === 'done' ? '#10b981'
    : '#1a7a8a';
  const textFill = state === 'active' ? '#00d2e6'
    : state === 'done' ? '#6ee7b7'
    : '#b8e8f0';
  const sw = state === 'active' ? 2 : 1.8;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect
        x={30} y={-55} width={250} height={34} rx={17}
        fill={pillFill} stroke={pillStroke} strokeWidth={sw}
        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
      />
      <text
        x={155} y={-32} textAnchor="middle"
        style={{
          fontFamily: 'inherit', fontSize: '14px', fontWeight: 700,
          fill: textFill, pointerEvents: 'none', transition: 'fill 0.15s',
        }}
      >
        General Appearance
      </text>
      <line x1={155} y1={-21} x2={155} y2={-8} stroke="#1a7a8a" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
      <polygon points="151,-9 155,-1 159,-9" fill="#1a7a8a" opacity={0.5} />
      {false && state !== 'default' && <circle cx={278} cy={-38} r={5} fill="#10b981" />}
    </g>
  );
}

/* ── Side Label ── */
function SideLabel({
  regionKey, label, state, onClick,
  labelX, labelY,
  hitBody, hitLabel,
  dotCx, dotCy,
}: {
  regionKey: RegionKey;
  label: string;
  state: 'default' | 'active' | 'done';
  onClick: () => void;
  labelX: number; labelY: number;
  hitBody: { x: number; y: number; w: number; h: number };
  hitLabel: { x: number; y: number; w: number; h: number };
  dotCx: number; dotCy: number;
}) {
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect x={hitBody.x} y={hitBody.y} width={hitBody.w} height={hitBody.h} rx={6} fill="transparent" />
      <text
        x={labelX} y={labelY}
        textAnchor="end"
        style={{
          fontFamily: 'inherit', fontSize: '15px', fontWeight: 700,
          fill: getLabelColor(state),
          cursor: 'pointer', transition: 'fill 0.15s',
        }}
      >
        {label}
      </text>
      <rect x={hitLabel.x} y={hitLabel.y} width={hitLabel.w} height={hitLabel.h} rx={6} fill="transparent" />
      <RevealDot cx={dotCx} cy={dotCy} state={state} />
    </g>
  );
}

/* ── White Box on Body ── */
function BodyBox({
  regionKey, label, state, onClick,
  boxX, boxY, boxW, boxH,
  hitX, hitY, hitW, hitH,
  dotCx, dotCy,
}: {
  regionKey: RegionKey;
  label: string;
  state: 'default' | 'active' | 'done';
  onClick: () => void;
  boxX: number; boxY: number; boxW: number; boxH: number;
  hitX: number; hitY: number; hitW: number; hitH: number;
  dotCx: number; dotCy: number;
}) {
  const rectFill = state === 'active' ? 'rgba(0,210,230,0.28)'
    : state === 'done' ? 'rgba(16,185,129,0.18)'
    : 'rgba(255,255,255,0.08)';
  const rectStroke = state === 'active' ? '#00d2e6'
    : state === 'done' ? '#10b981'
    : 'rgba(255,255,255,0.75)';
  const textFill = state === 'active' ? '#00d2e6'
    : state === 'done' ? '#6ee7b7'
    : 'white';
  const sw = state === 'active' ? 2 : 1.5;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect
        x={boxX} y={boxY} width={boxW} height={boxH} rx={5}
        fill={rectFill} stroke={rectStroke} strokeWidth={sw}
        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
      />
      <text
        x={boxX + boxW / 2} y={boxY + boxH / 2 + 6}
        textAnchor="middle"
        style={{
          fontFamily: 'inherit', fontSize: '16px', fontWeight: 700,
          fill: textFill, pointerEvents: 'none', transition: 'fill 0.15s',
        }}
      >
        {label}
      </text>
      <rect x={hitX} y={hitY} width={hitW} height={hitH} rx={6} fill="transparent" />
      <RevealDot cx={dotCx} cy={dotCy} state={state} />
    </g>
  );
}

/* ── Misc Dashed Pill ── */
function MiscPill({
  label, hasData, state, onClick,
}: {
  label: string;
  hasData: boolean;
  state: 'default' | 'active' | 'done';
  onClick: () => void;
}) {
  const isActive = state === 'active';
  const isDone = state === 'done';

  const pillFill = isActive ? 'rgba(0,210,230,0.25)'
    : isDone ? 'rgba(16,185,129,0.2)'
    : 'rgba(255,255,255,0.04)';
  const pillStroke = isActive ? '#00d2e6'
    : isDone ? '#10b981'
    : 'rgba(255,255,255,0.3)';
  const dashArray = (isActive || isDone) ? 'none' : '5,3';
  const textFill = isActive ? '#00d2e6'
    : isDone ? '#6ee7b7'
    : '#9dd8e8';
  const sw = isActive ? 2 : 1.5;

  return (
    <g style={{ cursor: hasData ? 'pointer' : 'default', opacity: hasData ? 1 : 0.5 }} onClick={onClick}>
      <rect
        x={240} y={276} width={90} height={36} rx={18}
        fill={pillFill} stroke={pillStroke} strokeWidth={sw}
        strokeDasharray={dashArray}
        style={{ transition: 'fill 0.15s, stroke 0.15s' }}
      />
      <text
        x={285} y={299}
        textAnchor="middle"
        style={{
          fontFamily: 'inherit', fontSize: '15px', fontWeight: 700,
          fill: textFill, pointerEvents: 'none', transition: 'fill 0.15s',
        }}
      >
        {label}
      </text>
      <rect x={236} y={272} width={98} height={44} rx={18} fill="transparent" />
      {false && (isActive || isDone) && <circle cx={330} cy={294} r={5} fill="#10b981" />}
    </g>
  );
}
