import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CoinSnapshot, Bias, TradeReadinessStatus, StructureLabel } from '../types/dashboard';
import { formatPrice, formatPct, formatLargeNumber } from '../lib/formatters';

interface SelectedCoinsTableProps {
  coins: CoinSnapshot[];
  selectedSymbol: string | null;
  onSelectCoin: (symbol: string) => void;
}

export default function SelectedCoinsTable({ coins, selectedSymbol, onSelectCoin }: SelectedCoinsTableProps) {
  return (
    <div
      className="flex flex-col rounded-[6px] overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      {/* Header */}
      <div
        className="grid text-[10px] uppercase tracking-widest px-4 py-2.5"
        style={{
          gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr 0.85fr 1.1fr 1fr 0.9fr 0.7fr',
          color: 'var(--color-text-muted)',
          borderBottom: '1px solid var(--color-surface-border)',
        }}
      >
        <span>Coin</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h %</span>
        <span className="text-center">Bias</span>
        <span className="text-right">Volume</span>
        <span className="text-center">Structure</span>
        <span className="text-right">Key Level</span>
        <span className="text-center">Score</span>
        <span className="text-center">Status</span>
      </div>

      {/* Rows */}
      {coins.map((coin, i) => (
        <CoinRow
          key={coin.symbol}
          coin={coin}
          isSelected={selectedSymbol === coin.symbol}
          isLast={i === coins.length - 1}
          onClick={() => onSelectCoin(coin.symbol)}
        />
      ))}
    </div>
  );
}

function CoinRow({
  coin,
  isSelected,
  isLast,
  onClick,
}: {
  coin: CoinSnapshot;
  isSelected: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const changeColor = coin.change24hPct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const ChangeIcon = coin.change24hPct > 0 ? TrendingUp : coin.change24hPct < 0 ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className="grid items-center px-4 py-3 cursor-pointer transition-colors"
      style={{
        gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr 0.85fr 1.1fr 1fr 0.9fr 0.7fr',
        backgroundColor: isSelected ? 'var(--color-surface-hover)' : 'transparent',
        borderLeft: isSelected ? '2px solid var(--color-accent)' : '2px solid transparent',
        borderBottom: isLast ? 'none' : '1px solid var(--color-surface-border)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-surface-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Coin name */}
      <div className="flex flex-col">
        <span className="font-mono text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {coin.symbol}
        </span>
        <span className="font-sans text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {coin.name}
        </span>
      </div>

      {/* Price */}
      <span className="font-mono text-[13px] text-right" style={{ color: 'var(--color-text-primary)' }}>
        {formatPrice(coin.priceUsd)}
      </span>

      {/* 24h % */}
      <div className="flex items-center justify-end gap-1" style={{ color: changeColor }}>
        <ChangeIcon size={11} strokeWidth={2.5} />
        <span className="font-mono text-[12px]">{formatPct(coin.change24hPct)}</span>
      </div>

      {/* Bias */}
      <div className="flex justify-center">
        <BiasBadge bias={coin.bias} />
      </div>

      {/* Volume */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {formatLargeNumber(coin.volume24hUsd)}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{
            color: coin.volumeVsAvgPct > 110
              ? 'var(--color-bullish)'
              : coin.volumeVsAvgPct < 90
                ? 'var(--color-bearish)'
                : 'var(--color-text-muted)',
          }}
        >
          {coin.volumeVsAvgPct}% of avg
        </span>
      </div>

      {/* Structure */}
      <div className="flex justify-center">
        <StructureBadge structure={coin.structure} />
      </div>

      {/* Key Level */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
          {formatPrice(coin.nearestKeyLevel.price)}
        </span>
        <span
          className="font-mono text-[10px]"
          style={{
            color: coin.nearestKeyLevel.proximityPct < 1
              ? 'var(--color-warning)'
              : 'var(--color-text-muted)',
          }}
        >
          {coin.nearestKeyLevel.proximityPct.toFixed(2)}% away
        </span>
      </div>

      {/* Score bar + value */}
      <div className="flex items-center gap-2 justify-center">
        <ScoreBar score={coin.tradeReadiness.total} />
        <span
          className="font-mono text-[12px] font-medium w-6 text-right"
          style={{ color: scoreColor(coin.tradeReadiness.total) }}
        >
          {coin.tradeReadiness.total.toFixed(1)}
        </span>
      </div>

      {/* Status */}
      <div className="flex justify-center">
        <StatusBadge status={coin.status} />
      </div>
    </div>
  );
}

export function BiasBadge({ bias }: { bias: Bias }) {
  const configs: Record<Bias, { color: string; bg: string; label: string }> = {
    BULLISH: { color: 'var(--color-bullish)', bg: 'var(--color-bullish-dim)', label: 'Bull' },
    BEARISH: { color: 'var(--color-bearish)', bg: 'var(--color-bearish-dim)', label: 'Bear' },
    NEUTRAL: { color: 'var(--color-neutral)', bg: 'var(--color-neutral-dim)', label: 'Neutral' },
  };
  const c = configs[bias];
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium uppercase tracking-wide"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}

function StructureBadge({ structure }: { structure: StructureLabel }) {
  const isPositive = ['TRENDING UP', 'BREAKOUT', 'ACCUMULATION'].includes(structure);
  const isNegative = ['TRENDING DOWN', 'BREAKDOWN', 'DISTRIBUTION'].includes(structure);
  const color = isPositive ? 'var(--color-bullish)' : isNegative ? 'var(--color-bearish)' : 'var(--color-text-secondary)';

  return (
    <span className="font-mono text-[10px] uppercase" style={{ color }}>
      {structure}
    </span>
  );
}

export function StatusBadge({ status }: { status: TradeReadinessStatus }) {
  const configs: Record<TradeReadinessStatus, { color: string; bg: string; border: string }> = {
    READY: {
      color: 'var(--color-bullish)',
      bg: 'var(--color-bullish-dim)',
      border: 'var(--color-bullish-muted)',
    },
    WATCH: {
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-dim)',
      border: 'var(--color-warning-muted)',
    },
    AVOID: {
      color: 'var(--color-bearish)',
      bg: 'var(--color-bearish-dim)',
      border: 'var(--color-bearish-muted)',
    },
  };
  const c = configs[status];
  return (
    <span
      className="px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

export function ScoreBar({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color = scoreColor(score);

  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ width: '40px', backgroundColor: 'var(--color-surface-border)' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--color-bullish)';
  if (score >= 5) return 'var(--color-warning)';
  return 'var(--color-bearish)';
}
