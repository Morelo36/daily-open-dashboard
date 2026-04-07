export type ScannerType = 'SHORTS' | 'VOLUME' | 'SWEEP' | 'HL' | 'BLH';
export type Direction = 'LONG' | 'SHORT' | 'NEUTRAL';
export type EvalResult = 'strong_win' | 'weak_win' | 'neutral' | 'loss' | 'pending';

export interface AlertEval {
  horizon: string;       // "15m" | "1H" | "4H"
  result: EvalResult;
  pctChange?: number | null;
}

export interface ScannerAlert {
  alert_id: string;
  ts: number;            // unix epoch (seconds)
  symbol: string;
  scanner: ScannerType;
  timeframe: string;
  direction: Direction;
  alert_price: number;
  score?: number | null;
  tier?: string | null;  // "HIGH" | "VERY_HIGH" | "EXTREME" | "PARABOLIC"
  extra: Record<string, unknown>;
  note: string;
  is_favorite: number;   // 0 | 1
  evals: AlertEval[];
}

export type AlertFilter = 'ALL' | ScannerType | 'FAVORITES';
