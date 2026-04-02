import { useState, useEffect, useCallback, useRef } from 'react';
import { mockDashboardData } from '../data/mockData';
import { fetchAllLiveData } from '../lib/api';
import type { DashboardData } from '../types/dashboard';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'SUI'];
const REFRESH_INTERVAL_MS = 30_000;

export type DataStatus = 'loading' | 'live' | 'error' | 'partial';

interface UseMarketDataReturn {
  data: DashboardData;
  status: DataStatus;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useMarketData(): UseMarketDataReturn {
  const [data, setData] = useState<DashboardData>(mockDashboardData);
  const [status, setStatus] = useState<DataStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // Track previous OI per coin to compute 24h OI change on subsequent fetches
  const prevOI = useRef<Record<string, number>>({});

  const doFetch = useCallback(async () => {
    setStatus((prev) => (prev === 'loading' ? 'loading' : prev));

    try {
      const live = await fetchAllLiveData(SYMBOLS);
      const now = new Date();

      setData((prev) => {
        const next = structuredClone(prev);

        // ── Per-coin live data ─────────────────────────────────────────────
        next.coins = prev.coins.map((coin) => {
          const t = live.tickers[coin.symbol];
          if (!t) return coin;

          return {
            ...coin,
            priceUsd: t.priceUsd,
            change24hPct: t.change24hPct,
            volume24hUsd: t.volume24hUsd,
          };
        });

        // ── Per-coin deep dive live data ──────────────────────────────────
        SYMBOLS.forEach((symbol) => {
          const t = live.tickers[symbol];
          if (!t || !next.deepDives[symbol]) return;

          const prevOIValue = prevOI.current[symbol];
          const oiChangePct =
            prevOIValue && prevOIValue > 0
              ? ((t.openInterestUsd - prevOIValue) / prevOIValue) * 100
              : prev.deepDives[symbol].derivatives.openInterestChange24hPct;

          next.deepDives[symbol] = {
            ...next.deepDives[symbol],
            priceUsd: t.priceUsd,
            change24hPct: t.change24hPct,
            derivatives: {
              ...next.deepDives[symbol].derivatives,
              fundingRatePct: t.fundingRatePct,
              openInterestUsd: t.openInterestUsd,
              openInterestChange24hPct: oiChangePct,
              longShortRatio: t.longShortRatio,
            },
          };
        });

        // Store current OI for next cycle's delta computation
        SYMBOLS.forEach((symbol) => {
          const t = live.tickers[symbol];
          if (t) prevOI.current[symbol] = t.openInterestUsd;
        });

        // ── Global market snapshot ─────────────────────────────────────────
        const btcTicker = live.tickers['BTC'];
        const ethTicker = live.tickers['ETH'];

        if (btcTicker) {
          next.global.btc = {
            price: btcTicker.priceUsd,
            change24hPct: btcTicker.change24hPct,
            dominancePct: live.global?.btcDominancePct ?? prev.global.btc.dominancePct,
          };
        }

        if (ethTicker) {
          const ethChange = ethTicker.change24hPct;
          const btcChange = btcTicker?.change24hPct ?? 0;
          next.global.eth = {
            price: ethTicker.priceUsd,
            change24hPct: ethChange,
            btcPairChange24hPct: parseFloat((ethChange - btcChange).toFixed(2)),
          };
        }

        if (live.global) {
          next.global.totalMarketCapUsd = live.global.totalMarketCapUsd;
          next.global.volume24hUsd = live.global.totalVolume24hUsd;
        }

        if (live.fng) {
          next.global.fearAndGreedIndex = {
            value: live.fng.value,
            label: live.fng.label,
          };
          next.summary.fearAndGreed = {
            value: live.fng.value,
            label: live.fng.label,
            change24h: prev.summary.fearAndGreed.change24h, // no historical delta available
          };
        }

        next.global.lastUpdated = now.toISOString();
        return next;
      });

      const anyMissing = SYMBOLS.some((s) => !live.tickers[s]);
      setStatus(anyMissing ? 'partial' : 'live');
      setError(null);
      setLastUpdated(now);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
      setStatus('error');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(doFetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [doFetch]);

  return { data, status, error, lastUpdated, refresh: doFetch };
}
