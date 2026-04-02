import type { DerivativesContext, FundingRateSentiment } from '../types/dashboard';
import { formatLargeNumber, formatFundingRate, formatPrice } from '../lib/formatters';
import { SectionLabel } from './TradeReadinessCard';

interface VolumeDerivativesCardProps {
  data: DerivativesContext;
  contextNotes: string[];
}

export default function VolumeDerivativesCard({ data, contextNotes }: VolumeDerivativesCardProps) {
  const fundingColor =
    data.fundingRateSentiment === 'ELEVATED_LONG'
      ? 'var(--color-bullish)'
      : data.fundingRateSentiment === 'ELEVATED_SHORT'
        ? 'var(--color-bearish)'
        : 'var(--color-text-secondary)';

  const fundingLabel: Record<FundingRateSentiment, string> = {
    ELEVATED_LONG: 'Longs paying — elevated',
    ELEVATED_SHORT: 'Shorts paying — elevated',
    NEUTRAL: 'Balanced — neutral',
  };

  const oiColor = data.openInterestChange24hPct >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const cvdColor = data.cumulativeVolumeDelta24h >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)';
  const lsColor = data.longShortRatio > 1.1 ? 'var(--color-bullish)' : data.longShortRatio < 0.9 ? 'var(--color-bearish)' : 'var(--color-text-secondary)';

  return (
    <div
      className="p-4 rounded-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      <SectionLabel>Volume &amp; Derivatives</SectionLabel>

      {/* Metrics grid */}
      <div className="grid gap-x-4 gap-y-3 mb-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <DerivMetric
          label="Funding Rate"
          value={formatFundingRate(data.fundingRatePct)}
          sub={fundingLabel[data.fundingRateSentiment]}
          valueColor={fundingColor}
        />
        <DerivMetric
          label="OI Change 24h"
          value={`${data.openInterestChange24hPct > 0 ? '+' : ''}${data.openInterestChange24hPct.toFixed(1)}%`}
          sub={`Total OI ${formatLargeNumber(data.openInterestUsd)}`}
          valueColor={oiColor}
        />
        <DerivMetric
          label="Long / Short"
          value={data.longShortRatio.toFixed(2)}
          sub={data.longShortRatio > 1 ? 'More longs than shorts' : 'More shorts than longs'}
          valueColor={lsColor}
        />
        <DerivMetric
          label="CVD 24h"
          value={formatLargeNumber(data.cumulativeVolumeDelta24h)}
          sub={data.cumulativeVolumeDelta24h >= 0 ? 'Net buy pressure' : 'Net sell pressure'}
          valueColor={cvdColor}
        />
      </div>

      {/* Liquidation levels */}
      <div
        className="flex justify-between px-3 py-2 rounded-sm mb-4"
        style={{ backgroundColor: 'var(--color-surface-overlay)' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Liq. Below
          </span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--color-bearish)' }}>
            {formatPrice(data.estimatedLiquidationDown)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Liq. Zones
          </span>
          <div className="h-px w-16" style={{ backgroundColor: 'var(--color-surface-border)' }} />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Liq. Above
          </span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--color-bullish)' }}>
            {formatPrice(data.estimatedLiquidationUp)}
          </span>
        </div>
      </div>

      {/* Context notes */}
      {contextNotes.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Analyst Notes
          </span>
          {contextNotes.map((note, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>—</span>
              <p className="font-sans text-[11px] leading-[1.5]" style={{ color: 'var(--color-text-secondary)' }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DerivMetric({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="font-mono text-[13px] font-medium" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="font-sans text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
        {sub}
      </span>
    </div>
  );
}
