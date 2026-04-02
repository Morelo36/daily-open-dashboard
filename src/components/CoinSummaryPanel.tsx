import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Bias } from '../types/dashboard';
import { formatPrice, formatPct } from '../lib/formatters';
import { BiasBadge } from './SelectedCoinsTable';

interface CoinSummaryPanelProps {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number;
  bias: Bias;
  oneLinerThesis: string;
}

export default function CoinSummaryPanel({
  symbol,
  name,
  priceUsd,
  change24hPct,
  bias,
  oneLinerThesis,
}: CoinSummaryPanelProps) {
  const changeColor = change24hPct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const ChangeIcon = change24hPct > 0 ? TrendingUp : change24hPct < 0 ? TrendingDown : Minus;

  return (
    <div
      className="p-4 rounded-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[22px] font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {symbol}
            </span>
            <span className="font-sans text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
              {name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-[18px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {formatPrice(priceUsd)}
            </span>
            <span className="flex items-center gap-1 font-mono text-[13px]" style={{ color: changeColor }}>
              <ChangeIcon size={13} strokeWidth={2.5} />
              {formatPct(change24hPct)}
            </span>
          </div>
        </div>
        <BiasBadge bias={bias} />
      </div>

      {/* Thesis */}
      <div
        className="px-3 py-2.5 rounded-sm"
        style={{
          backgroundColor: 'var(--color-surface-overlay)',
          borderLeft: '2px solid var(--color-accent)',
        }}
      >
        <p className="font-sans text-[12px] leading-[1.5]" style={{ color: 'var(--color-text-secondary)' }}>
          {oneLinerThesis}
        </p>
      </div>
    </div>
  );
}
