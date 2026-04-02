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
        label="Market Cap"
        value={formatLargeNumber(data.totalMarketCapUsd)}
        sub={`Vol ${formatLargeNumber(data.volume24hUsd)}/24h`}
        sentiment="neutral"
      />
      <Divider />
      <MetricPill
        label="Open Interest Δ"
        value={formatLargeNumber(data.openInterestChangeUsd)}
        sub={data.openInterestChangeUsd >= 0 ? 'OI expanding' : 'OI contracting'}
        sentiment={data.openInterestChangeUsd >= 0 ? 'bullish' : 'bearish'}
      />
      <Divider />
      <FearGreedPill value={data.fearAndGreedIndex.value} label={data.fearAndGreedIndex.label} />
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
        <span className="font-mono text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
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

function FearGreedPill({ value, label }: { value: number; label: string }) {
  const sentiment: Sentiment =
    value < 30 ? 'bearish' : value < 50 ? 'warning' : value < 75 ? 'bullish' : 'warning';
  const color = colorForSentiment(sentiment);

  return (
    <div className="flex flex-col justify-center px-5 py-2.5 gap-0.5 shrink-0">
      <span
        className="text-[10px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Fear &amp; Greed
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </span>
        <span
          className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm"
          style={{
            color,
            backgroundColor: `${color}22`,
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <div
          className="h-1 rounded-full"
          style={{
            width: '60px',
            background: 'linear-gradient(to right, #EF4444, #F59E0B, #22C55E)',
          }}
        />
        <div
          className="h-2 w-0.5 -mt-0.5 rounded-full"
          style={{
            marginLeft: `${(value / 100) * 60 - 1}px`,
            position: 'relative',
            left: `-${(value / 100) * 60}px`,
            backgroundColor: 'var(--color-text-primary)',
          }}
        />
      </div>
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
  const Icon = level === 'HIGH' ? AlertTriangle : level === 'MEDIUM' ? Activity : Activity;

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
