import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from 'lucide-react';
import type { GlobalMarketSnapshot, EventRiskLevel } from '../types/dashboard';
import { formatPrice, formatPct, formatLargeNumber } from '../lib/formatters';

interface GlobalSnapshotRowProps {
  data: GlobalMarketSnapshot;
}

export default function GlobalSnapshotRow({ data }: GlobalSnapshotRowProps) {
  return (
    <div
      className="flex items-stretch gap-0 overflow-x-auto"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-surface-border)',
      }}
    >
      <MetricPill
        label="Market Cap"
        value={formatLargeNumber(data.totalMarketCapUsd)}
        sub={`Vol ${formatLargeNumber(data.volume24hUsd)}/24h`}
        sentiment="neutral"
      />
      <Divider />
      <MetricPill
        label="BTC"
        value={formatPrice(data.btc.price)}
        delta={data.btc.change24hPct}
        sub={`DOM ${data.btc.dominancePct}%`}
        sentiment={data.btc.change24hPct >= 0 ? 'bullish' : 'bearish'}
      />
      <Divider />
      <MetricPill
        label="ETH"
        value={formatPrice(data.eth.price)}
        delta={data.eth.change24hPct}
        sub={`ETH/BTC ${data.eth.btcPairChange24hPct > 0 ? '+' : ''}${data.eth.btcPairChange24hPct.toFixed(2)}%`}
        sentiment={data.eth.change24hPct >= 0 ? 'bullish' : 'bearish'}
      />
      <Divider />
      <MetricPill
        label="Open Interest Δ"
        value={formatLargeNumber(data.openInterestChangeUsd)}
        sub={data.openInterestChangeUsd >= 0 ? 'OI expanding' : 'OI contracting'}
        sentiment={data.openInterestChangeUsd >= 0 ? 'bullish' : 'bearish'}
      />
      <Divider />
      <FearGreedGauge value={data.fearAndGreedIndex.value} label={data.fearAndGreedIndex.label} />
      <Divider />
      <EventRiskPill level={data.eventRisk.level} description={data.eventRisk.description} />
    </div>
  );
}

type Sentiment = 'bullish' | 'bearish' | 'neutral' | 'warning';

function colorForSentiment(s: Sentiment) {
  switch (s) {
    case 'bullish': return 'var(--color-bullish)';
    case 'bearish': return 'var(--color-bearish)';
    case 'warning': return 'var(--color-warning)';
    default: return 'var(--color-text-secondary)';
  }
}

function MetricPill({
  label,
  value,
  delta,
  sub,
  sentiment,
}: {
  label: string;
  value: string;
  delta?: number;
  sub?: string;
  sentiment: Sentiment;
}) {
  const color = colorForSentiment(sentiment);
  const Icon = delta === undefined ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex flex-col justify-center px-5 py-2.5 gap-0.5 shrink-0">
      <span
        className="text-[10px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </span>
        {delta !== undefined && (
          <span className="flex items-center gap-0.5 font-mono text-[11px]" style={{ color }}>
            <Icon size={11} strokeWidth={2.5} />
            {formatPct(delta)}
          </span>
        )}
      </div>
      {sub && (
        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ── Fear & Greed SVG Gauge ────────────────────────────────────────────────────

function fgColor(value: number): string {
  if (value < 30) return '#EF4444';
  if (value < 50) return '#F59E0B';
  if (value < 75) return '#22C55E';
  return '#F59E0B'; // extreme greed = warning
}

function fgLabel(value: number): string {
  if (value < 20) return 'Extreme Fear';
  if (value < 40) return 'Fear';
  if (value < 60) return 'Neutral';
  if (value < 80) return 'Greed';
  return 'Extreme Greed';
}

// Arc path helper: draw a semi-circle arc segment from startDeg to endDeg (0=left, 180=right)
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => ((d - 180) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function FearGreedGauge({ value, label: _label }: { value: number; label: string }) {
  const cx = 60, cy = 58, r = 44;
  const color = fgColor(value);
  const displayLabel = fgLabel(value);

  // Needle angle: 0 = leftmost (0 score), 180 = rightmost (100 score)
  const needleDeg = (value / 100) * 180;
  const needleRad = ((needleDeg - 180) * Math.PI) / 180;
  const needleLen = 36;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-1 shrink-0" style={{ minWidth: '130px' }}>
      <span
        className="text-[10px] uppercase tracking-widest font-sans mb-0.5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Fear &amp; Greed
      </span>

      <svg width="120" height="66" viewBox="0 0 120 66" style={{ overflow: 'visible' }}>
        {/* Background track */}
        <path
          d={arcPath(cx, cy, r, 0, 180)}
          fill="none"
          stroke="var(--color-surface-border)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Zone: Fear (0–39) → red */}
        <path
          d={arcPath(cx, cy, r, 0, 70)}
          fill="none"
          stroke="#EF444466"
          strokeWidth="7"
        />
        {/* Zone: Neutral (40–59) → amber */}
        <path
          d={arcPath(cx, cy, r, 70, 107)}
          fill="none"
          stroke="#F59E0B66"
          strokeWidth="7"
        />
        {/* Zone: Greed (60–100) → green */}
        <path
          d={arcPath(cx, cy, r, 107, 180)}
          fill="none"
          stroke="#22C55E66"
          strokeWidth="7"
        />
        {/* Active fill up to current value */}
        <path
          d={arcPath(cx, cy, r, 0, needleDeg)}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={nx} y2={ny}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill={color} />
        {/* Value text */}
        <text
          x={cx} y={cy + 14}
          textAnchor="middle"
          fill="var(--color-text-primary)"
          fontSize="13"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="600"
        >
          {value}
        </text>
        <text
          x={cx} y={cy + 24}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize="8"
          fontFamily="JetBrains Mono, monospace"
        >
          / 100
        </text>
      </svg>

      <span
        className="text-[9px] font-semibold uppercase tracking-wider -mt-1"
        style={{ color }}
      >
        {displayLabel}
      </span>
    </div>
  );
}

function eventRiskColor(level: EventRiskLevel): string {
  switch (level) {
    case 'HIGH': return 'var(--color-bearish)';
    case 'MEDIUM': return 'var(--color-warning)';
    case 'LOW': return 'var(--color-bullish)';
    default: return 'var(--color-text-muted)';
  }
}

function EventRiskPill({ level, description }: { level: EventRiskLevel; description: string }) {
  const color = eventRiskColor(level);
  const Icon = level === 'HIGH' ? AlertTriangle : Activity;

  return (
    <div className="flex flex-col justify-center px-5 py-2.5 gap-0.5 shrink-0 flex-1">
      <span
        className="text-[10px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Event Risk Today
      </span>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} strokeWidth={2} />
        <span
          className="font-mono text-[12px] font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {level}
        </span>
      </div>
      <span className="font-sans text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="self-stretch my-1.5"
      style={{ width: '1px', backgroundColor: 'var(--color-surface-border)' }}
    />
  );
}
