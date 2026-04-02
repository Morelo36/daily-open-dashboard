import { TrendingUp, TrendingDown, AlertTriangle, ShieldAlert, Target } from 'lucide-react';
import type { SummaryCards, MarketBias, RiskRegime, EventRiskLevel } from '../types/dashboard';

interface SummaryCardsRowProps {
  data: SummaryCards;
}

type Accent = 'bullish' | 'bearish' | 'warning' | 'neutral' | 'info';

function accentColor(a: Accent) {
  switch (a) {
    case 'bullish': return 'var(--color-bullish)';
    case 'bearish': return 'var(--color-bearish)';
    case 'warning': return 'var(--color-warning)';
    case 'info': return 'var(--color-info)';
    default: return 'var(--color-neutral)';
  }
}

function accentBg(a: Accent) {
  switch (a) {
    case 'bullish': return 'var(--color-bullish-dim)';
    case 'bearish': return 'var(--color-bearish-dim)';
    case 'warning': return 'var(--color-warning-dim)';
    case 'info': return 'var(--color-info-dim)';
    default: return 'var(--color-neutral-dim)';
  }
}

function biasAccent(bias: MarketBias): Accent {
  switch (bias) {
    case 'BULLISH': return 'bullish';
    case 'BEARISH': return 'bearish';
    case 'MIXED': return 'warning';
    default: return 'neutral';
  }
}

function regimeAccent(regime: RiskRegime): Accent {
  switch (regime) {
    case 'RISK-ON': return 'bullish';
    case 'RISK-OFF': return 'bearish';
    default: return 'warning';
  }
}

function eventAccent(level: EventRiskLevel): Accent {
  switch (level) {
    case 'HIGH': return 'bearish';
    case 'MEDIUM': return 'warning';
    default: return 'neutral';
  }
}

function fgAccent(value: number): Accent {
  if (value < 30) return 'bearish';
  if (value < 50) return 'warning';
  if (value < 75) return 'bullish';
  return 'warning';
}

export default function SummaryCardsRow({ data }: SummaryCardsRowProps) {
  const { marketBias, fearAndGreed, criticalEvents, riskRegime, bestFocus } = data;

  return (
    <div
      className="grid gap-3 px-6 py-4"
      style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
    >
      {/* Market Bias */}
      <SummaryCard
        icon={marketBias.value === 'BEARISH' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        label="Market Bias"
        value={marketBias.value}
        sub={marketBias.supporting}
        accent={biasAccent(marketBias.value)}
      />

      {/* Fear & Greed */}
      <SummaryCard
        icon={<span className="font-mono text-[12px]">{fearAndGreed.value}</span>}
        label="Fear & Greed"
        value={fearAndGreed.label}
        sub={`${fearAndGreed.change24h > 0 ? '+' : ''}${fearAndGreed.change24h} pts vs yesterday`}
        accent={fgAccent(fearAndGreed.value)}
      />

      {/* Critical Events */}
      <SummaryCard
        icon={<AlertTriangle size={14} />}
        label="Critical Events"
        value={`${criticalEvents.count} Today`}
        sub={`Next: ${criticalEvents.nextEvent}`}
        accent={eventAccent(criticalEvents.urgency)}
      />

      {/* Risk Regime */}
      <SummaryCard
        icon={<ShieldAlert size={14} />}
        label="Risk Regime"
        value={riskRegime.value}
        sub={riskRegime.supporting}
        accent={regimeAccent(riskRegime.value)}
      />

      {/* Best Focus */}
      <SummaryCard
        icon={<Target size={14} />}
        label="Best Focus Today"
        value={bestFocus.coinSymbol}
        sub={bestFocus.reason}
        accent="info"
      />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: Accent;
}) {
  const color = accentColor(accent);
  const bg = accentBg(accent);

  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-widest font-sans"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>

      <div
        className="font-mono text-[16px] font-semibold px-2 py-0.5 rounded-sm self-start"
        style={{ color, backgroundColor: bg }}
      >
        {value}
      </div>

      <p
        className="font-sans text-[11px] leading-[1.4]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {sub}
      </p>
    </div>
  );
}
