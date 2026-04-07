import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { GlobalMarketSnapshot } from '../types/dashboard';
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
      <InlineEventsStrip />
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
  const cx = 56, cy = 52, r = 40;
  const color = fgColor(value);
  const displayLabel = fgLabel(value);

  const needleDeg = (value / 100) * 180;
  const needleRad = ((needleDeg - 180) * Math.PI) / 180;
  const needleLen = 32;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 shrink-0">
      {/* Arc gauge — no number inside */}
      <svg width="112" height="60" viewBox="0 0 112 60" style={{ overflow: 'visible' }}>
        <path d={arcPath(cx, cy, r, 0, 180)} fill="none" stroke="var(--color-surface-border)" strokeWidth="7" strokeLinecap="round" />
        <path d={arcPath(cx, cy, r, 0, 70)}  fill="none" stroke="#EF444466" strokeWidth="7" />
        <path d={arcPath(cx, cy, r, 70, 107)} fill="none" stroke="#F59E0B66" strokeWidth="7" />
        <path d={arcPath(cx, cy, r, 107, 180)} fill="none" stroke="#22C55E66" strokeWidth="7" />
        <path d={arcPath(cx, cy, r, 0, needleDeg)} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.85" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>

      {/* Value + label to the right of the arc */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest font-sans" style={{ color: 'var(--color-text-muted)' }}>
          Fear &amp; Greed
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[22px] font-bold leading-none" style={{ color }}>
            {value}
          </span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            / 100
          </span>
        </div>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
          {displayLabel}
        </span>
      </div>
    </div>
  );
}

// ── Inline Events Strip ───────────────────────────────────────────────────────

interface EconEvent {
  title: string;
  time_il: string;
  is_today: boolean;
  forecast: string;
  previous: string;
  actual: string;
}

function isSoon(ev: EconEvent): boolean {
  const now = new Date();
  const ilHour = (now.getUTCHours() + 3) % 24;
  const ilMin  = now.getUTCMinutes();
  const [evH, evM] = ev.time_il.split(':').map(Number);
  const diff = (evH * 60 + evM) - (ilHour * 60 + ilMin);
  return diff >= 0 && diff <= 90;
}

function isPast(ev: EconEvent): boolean {
  const now = new Date();
  const ilHour = (now.getUTCHours() + 3) % 24;
  const ilMin  = now.getUTCMinutes();
  const [evH, evM] = ev.time_il.split(':').map(Number);
  return ilHour > evH || (ilHour === evH && ilMin >= evM);
}

function InlineEventsStrip() {
  const [events, setEvents] = useState<EconEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/events');
        const data: EconEvent[] = await r.json();
        setEvents(data.filter(e => e.is_today));
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col justify-center px-5 py-2.5 gap-1 flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <Calendar size={10} style={{ color: 'var(--color-text-muted)' }} />
        <span
          className="text-[10px] uppercase tracking-widest font-sans"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Critical Events Today
        </span>
      </div>

      {events.length === 0 ? (
        <span className="font-mono text-[22px]" style={{ color: 'var(--color-text-muted)' }}>
          No high-impact events
        </span>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {events.map((ev, i) => {
            const soon = isSoon(ev);
            const past = isPast(ev);
            const color = past
              ? 'var(--color-text-muted)'
              : soon
              ? 'var(--color-warning)'
              : 'var(--color-text-secondary)';

            return (
              <div
                key={i}
                className="flex items-baseline gap-1"
                style={{ opacity: past && !ev.actual ? 0.45 : 1 }}
              >
                <span className="font-mono text-[22px]" style={{ color }}>
                  {ev.time_il}
                </span>
                <span className="font-sans text-[22px]" style={{ color }}>
                  {ev.title}
                </span>
                {ev.actual && (
                  <span
                    className="font-mono text-[20px] font-semibold"
                    style={{ color: 'var(--color-bullish)' }}
                  >
                    {ev.actual}
                  </span>
                )}
                {soon && !ev.actual && (
                  <span
                    className="font-mono text-[18px] px-1 rounded-sm"
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.15)',
                      color: 'var(--color-warning)',
                    }}
                  >
                    SOON
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
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
