// ─── Primitive Union Types ────────────────────────────────────────────────────

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type TradeReadinessStatus = 'READY' | 'WATCH' | 'AVOID';
export type RiskRegime = 'RISK-ON' | 'RISK-OFF' | 'TRANSITIONAL';
export type MarketBias = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
export type EventRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type FundingRateSentiment = 'ELEVATED_LONG' | 'ELEVATED_SHORT' | 'NEUTRAL';
export type StructureLabel =
  | 'TRENDING UP'
  | 'TRENDING DOWN'
  | 'RANGING'
  | 'BREAKOUT'
  | 'BREAKDOWN'
  | 'ACCUMULATION'
  | 'DISTRIBUTION';

// ─── Global Market Snapshot ───────────────────────────────────────────────────

export interface GlobalMarketSnapshot {
  btc: {
    price: number;
    change24hPct: number;
    dominancePct: number;
  };
  eth: {
    price: number;
    change24hPct: number;
    btcPairChange24hPct: number;
  };
  totalMarketCapUsd: number;
  fearAndGreedIndex: {
    value: number;
    label: string;
  };
  eventRisk: {
    level: EventRiskLevel;
    description: string;
  };
  volume24hUsd: number;
  openInterestChangeUsd: number;
  lastUpdated: string;
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

export interface SummaryCards {
  marketBias: {
    value: MarketBias;
    supporting: string;
  };
  fearAndGreed: {
    value: number;
    label: string;
    change24h: number;
  };
  criticalEvents: {
    count: number;
    nextEvent: string;
    urgency: EventRiskLevel;
  };
  riskRegime: {
    value: RiskRegime;
    supporting: string;
  };
  bestFocus: {
    coinSymbol: string;
    reason: string;
  };
}

// ─── Key Level ────────────────────────────────────────────────────────────────

export interface KeyLevel {
  price: number;
  label: string;
  type: 'SUPPORT' | 'RESISTANCE' | 'PIVOT';
  proximityPct: number;
}

// ─── Trade Readiness ──────────────────────────────────────────────────────────

export interface TradeReadinessScore {
  total: number;
  momentum: number;
  structure: number;
  volume: number;
  riskReward: number;
  status: TradeReadinessStatus;
}

// ─── Selected Coin Snapshot (Table Row) ───────────────────────────────────────

export interface CoinSnapshot {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number;
  bias: Bias;
  volume24hUsd: number;
  volumeVsAvgPct: number;
  structure: StructureLabel;
  nearestKeyLevel: KeyLevel;
  tradeReadiness: TradeReadinessScore;
  status: TradeReadinessStatus;
}

// ─── Derivatives Context ──────────────────────────────────────────────────────

export interface DerivativesContext {
  fundingRatePct: number;
  fundingRateSentiment: FundingRateSentiment;
  openInterestUsd: number;
  openInterestChange24hPct: number;
  longShortRatio: number;
  estimatedLiquidationUp: number;
  estimatedLiquidationDown: number;
  cumulativeVolumeDelta24h: number;
}

// ─── Coin Deep Dive ───────────────────────────────────────────────────────────

export interface CoinDeepDive {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number;
  bias: Bias;
  oneLinerThesis: string;
  tradeReadiness: TradeReadinessScore;
  keyLevels: KeyLevel[];
  derivatives: DerivativesContext;
  contextNotes: string[];
}

// ─── Daily Narrative ──────────────────────────────────────────────────────────

export interface NarrativeSection {
  title: string;
  body: string;
}

export interface DailyNarrative {
  date: string;
  sessionLabel: string;
  headline: string;
  sections: NarrativeSection[];
  keyRisks: string[];
  traderDirective: string;
}

// ─── Root Dashboard Data ──────────────────────────────────────────────────────

export interface DashboardData {
  global: GlobalMarketSnapshot;
  summary: SummaryCards;
  coins: CoinSnapshot[];
  deepDives: Record<string, CoinDeepDive>;
  narrative: DailyNarrative;
}
