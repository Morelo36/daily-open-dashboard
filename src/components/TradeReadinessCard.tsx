import type { TradeReadinessScore } from '../types/dashboard';
import { StatusBadge, ScoreBar } from './SelectedCoinsTable';

interface TradeReadinessCardProps {
  score: TradeReadinessScore;
}

export default function TradeReadinessCard({ score }: TradeReadinessCardProps) {
  const totalColor =
    score.total >= 7
      ? 'var(--color-bullish)'
      : score.total >= 5
        ? 'var(--color-warning)'
        : 'var(--color-bearish)';

  const subScores: Array<{ label: string; value: number }> = [
    { label: 'Momentum', value: score.momentum },
    { label: 'Structure', value: score.structure },
    { label: 'Volume', value: score.volume },
    { label: 'Risk / Reward', value: score.riskReward },
  ];

  return (
    <div
      className="p-4 rounded-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      <SectionLabel>Trade Readiness</SectionLabel>

      {/* Score + status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[32px] font-semibold leading-none" style={{ color: totalColor }}>
            {score.total.toFixed(1)}
          </span>
          <span className="font-mono text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
            / 10
          </span>
        </div>
        <StatusBadge status={score.status} />
      </div>

      {/* Sub-scores */}
      <div className="flex flex-col gap-2.5">
        {subScores.map(({ label, value }) => {
          const subColor =
            value >= 7 ? 'var(--color-bullish)' : value >= 5 ? 'var(--color-warning)' : 'var(--color-bearish)';
          return (
            <div key={label} className="flex items-center gap-3">
              <span
                className="font-sans text-[11px] w-24 shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {label}
              </span>
              <div className="flex-1">
                <ScoreBar score={value} maxScore={10} />
              </div>
              <span
                className="font-mono text-[11px] font-medium w-4 text-right"
                style={{ color: subColor }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-sans text-[10px] uppercase tracking-widest mb-3 pb-2"
      style={{
        color: 'var(--color-text-muted)',
        borderBottom: '1px solid var(--color-surface-border)',
      }}
    >
      {children}
    </div>
  );
}
