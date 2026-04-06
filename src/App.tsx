import { useState, useEffect, useRef, useCallback } from 'react';

const LS_ADDED = 'dod_added_symbols';
const LS_REMOVED = 'dod_removed_symbols';

function loadAdded(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_ADDED) ?? '[]'); } catch { return []; }
}
function loadRemoved(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_REMOVED) ?? '[]'); } catch { return []; }
}
function saveAdded(symbols: string[]) {
  localStorage.setItem(LS_ADDED, JSON.stringify(symbols));
}
function saveRemoved(symbols: string[]) {
  localStorage.setItem(LS_REMOVED, JSON.stringify(symbols));
}
import './index.css';
import { useMarketData } from './hooks/useMarketData';
import { fetchLiveTicker } from './lib/api';
import TopBar from './components/TopBar';
import GlobalSnapshotRow from './components/GlobalSnapshotRow';
import MarketStatusBar from './components/MarketStatusBar';
import SelectedCoinsTable from './components/SelectedCoinsTable';
import LiveAlertsTable from './components/LiveAlertsTable';
import CriticalEventsPanel from './components/CriticalEventsPanel';
import type { CoinSnapshot, CoinDeepDive } from './types/dashboard';
import type { LiveTickerData } from './lib/api';

function tickerToCoinSnapshot(t: LiveTickerData): CoinSnapshot {
  return {
    symbol: t.symbol,
    name: t.symbol,
    priceUsd: t.priceUsd,
    change24hPct: t.change24hPct,
    bias: 'NEUTRAL',
    volume24hUsd: t.volume24hUsd,
    volumeVsAvgPct: 100,
    structure: 'RANGING',
    nearestKeyLevel: { price: t.priceUsd, label: 'No TA data', type: 'PIVOT', proximityPct: 0 },
    tradeReadiness: { total: 5, momentum: 5, structure: 5, volume: 5, riskReward: 5, status: 'WATCH' },
    status: 'WATCH',
  };
}

function tickerToDeepDive(t: LiveTickerData): CoinDeepDive {
  return {
    symbol: t.symbol,
    name: t.symbol,
    priceUsd: t.priceUsd,
    change24hPct: t.change24hPct,
    bias: 'NEUTRAL',
    oneLinerThesis: 'Live price data only — no TA analysis available for manually added coins.',
    tradeReadiness: { total: 5, momentum: 5, structure: 5, volume: 5, riskReward: 5, status: 'WATCH' },
    keyLevels: [
      { price: t.priceUsd, label: 'Current Price', type: 'PIVOT', proximityPct: 0 },
    ],
    derivatives: {
      fundingRatePct: t.fundingRatePct,
      fundingRateSentiment: t.fundingRatePct > 0.005 ? 'ELEVATED_LONG' : t.fundingRatePct < -0.005 ? 'ELEVATED_SHORT' : 'NEUTRAL',
      openInterestUsd: t.openInterestUsd,
      openInterestChange24hPct: 0,
      longShortRatio: t.longShortRatio,
      estimatedLiquidationUp: t.priceUsd * 1.1,
      estimatedLiquidationDown: t.priceUsd * 0.9,
      cumulativeVolumeDelta24h: 0,
    },
    contextNotes: [
      'Manually added coin — only live Bybit perpetual data shown.',
      'Bias, structure, and key levels require manual TA input.',
    ],
  };
}

// ── Live prices for alert % Move column ──────────────────────────────────────
// Fetches Bybit tickers for alert symbols every 30s via the public REST API.
function useLiveAlertPrices(symbols: string[]): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const prevSymbols = useRef<string>('');

  const fetchPrices = useCallback(async (syms: string[]) => {
    if (!syms.length) return;
    // Batch: Bybit linear tickers endpoint returns all at once
    try {
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
      const json = await res.json();
      const list: { symbol: string; lastPrice: string }[] = json?.result?.list ?? [];
      const symSet = new Set(syms);
      const map: Record<string, number> = {};
      for (const item of list) {
        if (symSet.has(item.symbol)) {
          map[item.symbol] = parseFloat(item.lastPrice);
        }
      }
      setPrices(prev => ({ ...prev, ...map }));
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    const key = symbols.slice().sort().join(',');
    if (key === prevSymbols.current) return;
    prevSymbols.current = key;
    fetchPrices(symbols);
    const id = setInterval(() => fetchPrices(symbols), 30_000);
    return () => clearInterval(id);
  }, [symbols, fetchPrices]);

  return prices;
}

export default function App() {
  const { data, status, refresh, lastUpdated } = useMarketData();
  const [removedSymbols, setRemovedSymbols] = useState<Set<string>>(
    () => new Set(loadRemoved())
  );
  const [addedCoins, setAddedCoins] = useState<CoinSnapshot[]>([]);
  const [addedDeepDives, setAddedDeepDives] = useState<Record<string, CoinDeepDive>>({});

  // Track unique alert symbols so we can fetch live prices for % Move
  const [alertSymbols, setAlertSymbols] = useState<string[]>([]);
  const livePrices = useLiveAlertPrices(alertSymbols);

  // On mount: re-fetch any previously added coins from localStorage
  useEffect(() => {
    const symbols = [...new Set(loadAdded())]; // deduplicate saved list
    if (!symbols.length) return;
    Promise.all(symbols.map((s) => fetchLiveTicker(s))).then((results) => {
      const coins: CoinSnapshot[] = [];
      const dives: Record<string, CoinDeepDive> = {};
      const seen = new Set<string>();
      results.forEach((t) => {
        if (!t || seen.has(t.symbol)) return;
        seen.add(t.symbol);
        coins.push(tickerToCoinSnapshot(t));
        dives[t.symbol] = tickerToDeepDive(t);
      });
      setAddedCoins(coins);
      setAddedDeepDives(dives);
    });
  }, []);

  // Persist to localStorage on every change
  useEffect(() => { saveAdded(addedCoins.map((c) => c.symbol)); }, [addedCoins]);
  useEffect(() => { saveRemoved([...removedSymbols]); }, [removedSymbols]);

  const allCoins: CoinSnapshot[] = [...data.coins, ...addedCoins].filter(
    (c) => !removedSymbols.has(c.symbol)
  );

  function handleRemoveCoin(symbol: string) {
    setRemovedSymbols((prev) => new Set([...prev, symbol]));
    setAddedCoins((prev) => prev.filter((c) => c.symbol !== symbol));
    setAddedDeepDives((prev) => { const n = { ...prev }; delete n[symbol]; return n; });
  }

  async function handleAddCoin(raw: string): Promise<'ok' | string> {
    const symbol = raw.toUpperCase().trim();
    if (allCoins.some((c) => c.symbol === symbol)) return 'Already in watchlist';
    const ticker = await fetchLiveTicker(symbol);
    if (!ticker) return `${symbol}USDT not found on Bybit perpetuals`;
    setRemovedSymbols((prev) => { const next = new Set(prev); next.delete(symbol); return next; });
    if (!data.coins.some((c) => c.symbol === symbol)) {
      // Use functional updater so the duplicate check runs against the latest state,
      // preventing a race condition where two adds slip through before re-render.
      setAddedCoins((prev) => prev.some((c) => c.symbol === symbol) ? prev : [...prev, tickerToCoinSnapshot(ticker)]);
      setAddedDeepDives((prev) => ({ ...prev, [symbol]: tickerToDeepDive(ticker) }));
    }
    return 'ok';
  }

  // Suppress unused variable warning
  void addedDeepDives;

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
        coins={allCoins}
        onAddCoin={handleAddCoin}
        onRemoveCoin={handleRemoveCoin}
        onRefresh={refresh}
        lastUpdated={lastUpdated?.toISOString() ?? data.global.lastUpdated}
        dataStatus={status}
      />

      <GlobalSnapshotRow data={data.global} />
      <MarketStatusBar />

      <div className="flex-1 px-6 py-4 flex flex-col gap-4" style={{ minWidth: 0 }}>
        {/* Operational section: Live Alerts (left) + Watchlist (right) */}
        <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>

          {/* Live Alerts Table — dominant */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <AlertsSectionHeader />
            <LiveAlertsTable
              livePrices={livePrices}
              onSymbolsChange={setAlertSymbols}
            />
          </div>

          {/* Watchlist + Critical Events sidebar */}
          <div style={{ flex: '0 0 400px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <WatchlistHeader count={allCoins.length} status={status} />
              <SelectedCoinsTable
                coins={allCoins}
                selectedSymbol={null}
                onSelectCoin={() => {}}
              />
            </div>
            <CriticalEventsPanel />
          </div>
        </div>

        <div style={{ height: '16px' }} />
      </div>
    </div>
  );
}

function AlertsSectionHeader() {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="text-[10px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Scanner Alerts
      </span>
    </div>
  );
}

function WatchlistHeader({ count, status }: { count: number; status: string }) {
  const configs: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    loading: { label: 'Fetching…', color: 'var(--color-text-muted)', bg: 'var(--color-surface-overlay)', dot: 'var(--color-warning)' },
    live:    { label: 'Live', color: 'var(--color-bullish)', bg: 'var(--color-bullish-dim)', dot: 'var(--color-bullish)' },
    partial: { label: 'Partial', color: 'var(--color-warning)', bg: 'var(--color-warning-dim)', dot: 'var(--color-warning)' },
    error:   { label: 'Mock', color: 'var(--color-bearish)', bg: 'var(--color-bearish-dim)', dot: 'var(--color-bearish)' },
  };
  const c = configs[status] ?? configs.loading;

  return (
    <div className="mb-2 flex items-center justify-between">
      <span
        className="text-[10px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Watchlist — {count}
      </span>
      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px]"
        style={{ backgroundColor: c.bg, border: `1px solid ${c.dot}22` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
        <span style={{ color: c.color }}>{c.label}</span>
      </div>
    </div>
  );
}
