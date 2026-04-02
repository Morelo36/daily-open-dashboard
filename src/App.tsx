import { useState } from 'react';
import './index.css';
import { useMarketData } from './hooks/useMarketData';
import TopBar from './components/TopBar';
import GlobalSnapshotRow from './components/GlobalSnapshotRow';
import SummaryCardsRow from './components/SummaryCardsRow';
import SelectedCoinsTable from './components/SelectedCoinsTable';
import CoinSummaryPanel from './components/CoinSummaryPanel';
import TradeReadinessCard from './components/TradeReadinessCard';
import KeyLevelsCard from './components/KeyLevelsCard';
import VolumeDerivativesCard from './components/VolumeDerivativesCard';
import DailyNarrativePanel from './components/DailyNarrativePanel';
import type { CoinSnapshot } from './types/dashboard';

export default function App() {
  const { data, status, refresh, lastUpdated } = useMarketData();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>('SOL');
  const [removedSymbols, setRemovedSymbols] = useState<Set<string>>(new Set());

  const coins: CoinSnapshot[] = data.coins.filter((c) => !removedSymbols.has(c.symbol));
  const deepDive = selectedSymbol ? data.deepDives[selectedSymbol] ?? null : null;

  function handleSelectCoin(symbol: string) {
    setSelectedSymbol((prev) => (prev === symbol ? null : symbol));
  }

  function handleRemoveCoin(symbol: string) {
    setRemovedSymbols((prev) => new Set([...prev, symbol]));
    if (selectedSymbol === symbol) setSelectedSymbol(null);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar
        coins={coins}
        onAddCoin={() => {}}
        onRemoveCoin={handleRemoveCoin}
        onRefresh={refresh}
        lastUpdated={lastUpdated?.toISOString() ?? data.global.lastUpdated}
        dataStatus={status}
      />

      <GlobalSnapshotRow data={data.global} />

      <div className="flex-1 px-6 py-4 flex flex-col gap-4" style={{ minWidth: 0 }}>
        <div style={{ margin: '0 -24px', padding: '0 24px' }}>
          <SummaryCardsRow data={data.summary} />
        </div>

        {/* Two-column: Coin Table | Deep Dive */}
        <div className="flex gap-4" style={{ minHeight: '360px' }}>
          <div style={{ flex: '0 0 55%', minWidth: 0 }}>
            <div className="mb-3 flex items-center justify-between">
              <span
                className="text-[10px] uppercase tracking-widest font-sans"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Watchlist — {coins.length} coins
              </span>
              <StatusPill status={status} />
            </div>
            <SelectedCoinsTable
              coins={coins}
              selectedSymbol={selectedSymbol}
              onSelectCoin={handleSelectCoin}
            />
          </div>

          <div style={{ flex: '1 1 45%', minWidth: 0 }}>
            {deepDive ? (
              <div className="flex flex-col gap-3">
                <CoinSummaryPanel
                  symbol={deepDive.symbol}
                  name={deepDive.name}
                  priceUsd={deepDive.priceUsd}
                  change24hPct={deepDive.change24hPct}
                  bias={deepDive.bias}
                  oneLinerThesis={deepDive.oneLinerThesis}
                />
                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <TradeReadinessCard score={deepDive.tradeReadiness} />
                  <KeyLevelsCard levels={deepDive.keyLevels} currentPrice={deepDive.priceUsd} />
                </div>
                <VolumeDerivativesCard
                  data={deepDive.derivatives}
                  contextNotes={deepDive.contextNotes}
                />
              </div>
            ) : (
              <DeepDivePlaceholder />
            )}
          </div>
        </div>

        <DailyNarrativePanel data={data.narrative} />
        <div style={{ height: '16px' }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    loading: {
      label: 'Fetching…',
      color: 'var(--color-text-muted)',
      bg: 'var(--color-surface-overlay)',
      dot: 'var(--color-warning)',
    },
    live: {
      label: 'Live',
      color: 'var(--color-bullish)',
      bg: 'var(--color-bullish-dim)',
      dot: 'var(--color-bullish)',
    },
    partial: {
      label: 'Partial',
      color: 'var(--color-warning)',
      bg: 'var(--color-warning-dim)',
      dot: 'var(--color-warning)',
    },
    error: {
      label: 'Mock data',
      color: 'var(--color-bearish)',
      bg: 'var(--color-bearish-dim)',
      dot: 'var(--color-bearish)',
    },
  };
  const c = configs[status] ?? configs.loading;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px]"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.dot}22` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: c.dot, boxShadow: status === 'live' ? `0 0 4px ${c.dot}` : 'none' }}
      />
      <span style={{ color: c.color }}>{c.label}</span>
    </div>
  );
}

function DeepDivePlaceholder() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full rounded-[6px]"
      style={{ border: '1px dashed var(--color-surface-border)', minHeight: '200px' }}
    >
      <span className="font-sans text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
        Select a coin from the table to view detailed analysis
      </span>
    </div>
  );
}
