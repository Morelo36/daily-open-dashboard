// All public API fetches — no auth required

const BYBIT = 'https://api.bybit.com/v5';
const FNG_URL = 'https://api.alternative.me/fng/?limit=1';
const COINGECKO_GLOBAL = 'https://api.coingecko.com/api/v3/global';

// ─── Bybit response types ─────────────────────────────────────────────────────

interface BybitTicker {
  symbol: string;
  lastPrice: string;
  price24hPcnt: string;
  prevPrice24h: string;
  highPrice24h: string;
  lowPrice24h: string;
  turnover24h: string;   // 24h volume in USD
  volume24h: string;     // 24h volume in base asset
  fundingRate: string;
  openInterestValue: string; // OI in USD
}

interface BybitLongShort {
  buyRatio: string;
  sellRatio: string;
}

// ─── Normalised output types ──────────────────────────────────────────────────

export interface LiveTickerData {
  symbol: string;
  priceUsd: number;
  change24hPct: number;
  prevPrice24h: number;
  high24h: number;
  low24h: number;
  volume24hUsd: number;
  fundingRatePct: number;
  openInterestUsd: number;
  longShortRatio: number;
}

export interface LiveGlobalData {
  totalMarketCapUsd: number;
  totalVolume24hUsd: number;
  btcDominancePct: number;
  ethDominancePct: number;
}

export interface LiveFearAndGreed {
  value: number;
  label: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json() as Promise<T>;
}

// ─── Bybit ticker ─────────────────────────────────────────────────────────────

async function fetchBybitTicker(symbol: string): Promise<BybitTicker | null> {
  try {
    const data = await get<{ retCode: number; result: { list: BybitTicker[] } }>(
      `${BYBIT}/market/tickers?category=linear&symbol=${symbol}`
    );
    if (data.retCode !== 0 || !data.result.list.length) return null;
    return data.result.list[0];
  } catch {
    return null;
  }
}

// ─── Bybit long/short ratio ───────────────────────────────────────────────────

async function fetchBybitLongShort(symbol: string): Promise<BybitLongShort | null> {
  try {
    const data = await get<{ retCode: number; result: { list: BybitLongShort[] } }>(
      `${BYBIT}/market/account-ratio?category=linear&symbol=${symbol}&period=1d&limit=1`
    );
    if (data.retCode !== 0 || !data.result.list.length) return null;
    return data.result.list[0];
  } catch {
    return null;
  }
}

// ─── Combined per-coin fetch ──────────────────────────────────────────────────

export async function fetchLiveTicker(symbol: string): Promise<LiveTickerData | null> {
  const bybitSymbol = `${symbol}USDT`;
  const [ticker, ls] = await Promise.all([
    fetchBybitTicker(bybitSymbol),
    fetchBybitLongShort(bybitSymbol),
  ]);
  if (!ticker) return null;

  const buyRatio = ls ? parseFloat(ls.buyRatio) : 0.5;
  const sellRatio = ls ? parseFloat(ls.sellRatio) : 0.5;

  return {
    symbol,
    priceUsd: parseFloat(ticker.lastPrice),
    change24hPct: parseFloat(ticker.price24hPcnt) * 100,
    prevPrice24h: parseFloat(ticker.prevPrice24h),
    high24h: parseFloat(ticker.highPrice24h),
    low24h: parseFloat(ticker.lowPrice24h),
    volume24hUsd: parseFloat(ticker.turnover24h),
    fundingRatePct: parseFloat(ticker.fundingRate),
    openInterestUsd: parseFloat(ticker.openInterestValue),
    longShortRatio: sellRatio > 0 ? buyRatio / sellRatio : 1,
  };
}

// ─── CoinGecko global ─────────────────────────────────────────────────────────

export async function fetchLiveGlobal(): Promise<LiveGlobalData | null> {
  try {
    const data = await get<{
      data: {
        total_market_cap: Record<string, number>;
        total_volume: Record<string, number>;
        market_cap_percentage: Record<string, number>;
      };
    }>(COINGECKO_GLOBAL);

    return {
      totalMarketCapUsd: data.data.total_market_cap.usd ?? 0,
      totalVolume24hUsd: data.data.total_volume.usd ?? 0,
      btcDominancePct: data.data.market_cap_percentage.btc ?? 0,
      ethDominancePct: data.data.market_cap_percentage.eth ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Fear & Greed ─────────────────────────────────────────────────────────────

export async function fetchFearAndGreed(): Promise<LiveFearAndGreed | null> {
  try {
    const data = await get<{ data: Array<{ value: string; value_classification: string }> }>(FNG_URL);
    if (!data.data.length) return null;
    return {
      value: parseInt(data.data[0].value, 10),
      label: data.data[0].value_classification,
    };
  } catch {
    return null;
  }
}

// ─── Fetch everything in parallel ────────────────────────────────────────────

export interface AllLiveData {
  tickers: Record<string, LiveTickerData>;
  global: LiveGlobalData | null;
  fng: LiveFearAndGreed | null;
}

export async function fetchAllLiveData(symbols: string[]): Promise<AllLiveData> {
  const [tickerResults, global, fng] = await Promise.all([
    Promise.all(symbols.map((s) => fetchLiveTicker(s))),
    fetchLiveGlobal(),
    fetchFearAndGreed(),
  ]);

  const tickers: Record<string, LiveTickerData> = {};
  symbols.forEach((s, i) => {
    const t = tickerResults[i];
    if (t) tickers[s] = t;
  });

  return { tickers, global, fng };
}
