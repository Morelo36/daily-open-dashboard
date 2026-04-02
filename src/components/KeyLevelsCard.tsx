import type { KeyLevel } from '../types/dashboard';
import { formatPrice } from '../lib/formatters';
import { SectionLabel } from './TradeReadinessCard';

interface KeyLevelsCardProps {
  levels: KeyLevel[];
  currentPrice: number;
}

export default function KeyLevelsCard({ levels, currentPrice }: KeyLevelsCardProps) {
  // Sort levels descending by price so resistance appears above pivot above support
  const sorted = [...levels].sort((a, b) => b.price - a.price);

  return (
    <div
      className="p-4 rounded-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      <SectionLabel>Key Levels</SectionLabel>

      <div className="flex flex-col gap-0">
        {sorted.map((level, i) => {
          const isPivot = level.type === 'PIVOT';
          const isResistance = level.type === 'RESISTANCE';
          const isAboveCurrent = level.price > currentPrice;

          const typeColor = isPivot
            ? 'var(--color-accent)'
            : isResistance
              ? 'var(--color-bearish)'
              : 'var(--color-bullish)';

          const proximityHighlight =
            !isPivot && level.proximityPct < 0.5
              ? 'var(--color-bearish)'
              : !isPivot && level.proximityPct < 1.5
                ? 'var(--color-warning)'
                : 'var(--color-text-muted)';

          return (
            <div
              key={`${level.price}-${i}`}
              className="flex items-center justify-between py-2"
              style={{
                borderBottom:
                  i < sorted.length - 1 ? '1px solid var(--color-surface-border)' : 'none',
                backgroundColor: isPivot ? 'var(--color-surface-overlay)' : 'transparent',
                borderRadius: isPivot ? '4px' : undefined,
                padding: isPivot ? '6px 8px' : '8px 2px',
                marginInline: isPivot ? '-4px' : undefined,
              }}
            >
              {/* Type indicator + label */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: typeColor }}
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-sans text-[11px] truncate"
                    style={{ color: isPivot ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                  >
                    {level.label}
                  </span>
                  <span
                    className="font-sans text-[10px]"
                    style={{ color: typeColor }}
                  >
                    {isPivot ? 'Current Price' : isAboveCurrent ? 'Resistance' : 'Support'}
                  </span>
                </div>
              </div>

              {/* Price + proximity */}
              <div className="flex flex-col items-end shrink-0 ml-2">
                <span
                  className="font-mono text-[12px] font-medium"
                  style={{ color: isPivot ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
                >
                  {formatPrice(level.price)}
                </span>
                {!isPivot && (
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: proximityHighlight }}
                  >
                    {level.proximityPct.toFixed(2)}% away
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
