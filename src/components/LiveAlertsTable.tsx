import { useState, useRef, useEffect, useMemo } from 'react';
import type { ScannerAlert, AlertFilter, EvalResult } from '../types/alerts';
import { useAlerts } from '../hooks/useAlerts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fullTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function signalTime(ts: number): string {
  // Display in Israel time (UTC+3 / IDT)
  return new Date(ts * 1000).toLocaleTimeString('en-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
    hour12: false,
  });
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(6);
}

function tvUrl(symbol: string): string {
  const sym = symbol.replace('USDT', '');
  return `https://www.tradingview.com/chart/?symbol=BYBIT:${sym}USDT.P`;
}

function pctMove(alert: ScannerAlert, livePrices: Record<string, number>): number | null {
  const current = livePrices[alert.symbol];
  if (!current || !alert.alert_price) return null;
  return (current - alert.alert_price) / alert.alert_price * 100;
}

const TIER_RANK: Record<string, number> = { PARABOLIC: 4, EXTREME: 3, VERY_HIGH: 2, HIGH: 1 };
const EVAL_RANK: Record<string, number> = { strong_win: 4, weak_win: 3, neutral: 2, loss: 1, pending: 0 };

function bestEvalResult(a: ScannerAlert): string {
  if (!a.evals.length) return 'pending';
  return a.evals.reduce((best, e) =>
    (EVAL_RANK[e.result] ?? 0) > (EVAL_RANK[best] ?? 0) ? e.result : best
  , 'pending');
}

// ── Sort types ────────────────────────────────────────────────────────────────

type SortKey = 'ts' | 'symbol' | 'scanner' | 'timeframe' | 'direction' |
               'alert_price' | 'pctMove' | 'tier' | 'score' | 'eval_15m' | 'eval_1h';
type SortDir = 'asc' | 'desc';

// ── Filter types ──────────────────────────────────────────────────────────────

interface Filters {
  direction: 'ALL' | 'LONG' | 'SHORT';
  timeframe: 'ALL' | '15m' | '1H' | '4H';
  eval: 'ANY' | 'WIN' | 'LOSS' | 'PENDING';
  scoreMin: string; // string for input binding
}

const DEFAULT_FILTERS: Filters = { direction: 'ALL', timeframe: 'ALL', eval: 'ANY', scoreMin: '' };

// ── Sub-components ────────────────────────────────────────────────────────────

function ScannerBadge({ scanner }: { scanner: string }) {
  const styles: Record<string, string> = {
    SHORTS: 'bg-[#2d1a1a] text-[#EF4444] border-[#5a2020]',
    VOLUME: 'bg-[#1a2030] text-[#3B82F6] border-[#1e3a5f]',
    SWEEP:  'bg-[#1a2a1a] text-[#22C55E] border-[#1a4a1a]',
    HL:     'bg-[#2a2010] text-[#F59E0B] border-[#5a4010]',
  };
  const labels: Record<string, string> = { SHORTS: 'SHORT', VOLUME: 'VOL', SWEEP: 'SWEEP', HL: 'H.LOW' };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${styles[scanner] ?? 'bg-[#1a1a2a] text-[#9090A0] border-[#242430]'}`}>
      {labels[scanner] ?? scanner}
    </span>
  );
}

function DirectionBadge({ dir }: { dir: string }) {
  if (dir === 'LONG') return (
    <span className="inline-flex items-center gap-0.5 text-[#22C55E] font-semibold text-[11px]">
      <span>↑</span><span>LONG</span>
    </span>
  );
  if (dir === 'SHORT') return (
    <span className="inline-flex items-center gap-0.5 text-[#EF4444] font-semibold text-[11px]">
      <span>↓</span><span>SHORT</span>
    </span>
  );
  return <span className="text-[#9090A0] text-[11px]">—</span>;
}

function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return <span className="text-[#9090A0] text-[10px]">—</span>;
  const styles: Record<string, string> = {
    HIGH:       'text-[#F59E0B]',
    VERY_HIGH:  'text-[#F97316]',
    EXTREME:    'text-[#EF4444]',
    PARABOLIC:  'text-[#A855F7]',
  };
  return (
    <span className={`text-[10px] font-semibold uppercase ${styles[tier] ?? 'text-[#9090A0]'}`}>
      {tier.replace('_', ' ')}
    </span>
  );
}

function EvalBadge({ result }: { result: EvalResult }) {
  const cfg: Record<EvalResult, { label: string; cls: string }> = {
    strong_win: { label: '✓✓', cls: 'text-[#22C55E] bg-[#14532d]' },
    weak_win:   { label: '✓',  cls: 'text-[#86efac] bg-[#052e16]' },
    neutral:    { label: '—',  cls: 'text-[#9090A0] bg-[#1a1a2a]' },
    loss:       { label: '✗',  cls: 'text-[#EF4444] bg-[#450a0a]' },
    pending:    { label: '…',  cls: 'text-[#9090A0] bg-[#111118]' },
  };
  const { label, cls } = cfg[result] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  );
}

function PctMoveCell({ alert, livePrices }: { alert: ScannerAlert; livePrices: Record<string, number> }) {
  const pct = pctMove(alert, livePrices);
  if (pct === null) return <span className="text-[#9090A0] text-[11px]">—</span>;
  const favorable = alert.direction === 'SHORT' ? pct <= 0 : alert.direction === 'LONG' ? pct >= 0 : null;
  const color = favorable === true ? '#22C55E' : favorable === false ? '#EF4444' : '#9090A0';
  return (
    <span style={{ color }} className="font-mono text-[11px] font-semibold">
      {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function Tags({ alert }: { alert: ScannerAlert }) {
  const tags: string[] = [];
  const extra = alert.extra;
  if (extra.pattern && typeof extra.pattern === 'string') tags.push(extra.pattern.replace(/_/g, ' '));
  if (typeof extra.rsi === 'number') tags.push(`RSI ${(extra.rsi as number).toFixed(0)}`);
  if (typeof extra.spike_vs_median === 'number') tags.push(`${(extra.spike_vs_median as number).toFixed(0)}×`);
  if (typeof extra.sweep_depth_pct === 'number') tags.push(`depth ${(extra.sweep_depth_pct as number).toFixed(2)}%`);
  if (typeof extra.early_window === 'number' && (extra.early_window as number) > 1) tags.push(`w${extra.early_window}`);
  if (!tags.length) return <span className="text-[#F0F0F5] text-[10px]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t, i) => (
        <span key={i} className="px-1 py-0 rounded text-[9px] bg-[#18181F] text-[#F0F0F5] border border-[#242430] whitespace-nowrap">
          {t}
        </span>
      ))}
    </div>
  );
}

function NoteCell({ alert, onSave }: { alert: ScannerAlert; onSave: (id: string, note: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(alert.note);

  // Sync if alert.note changes externally
  useEffect(() => { setVal(alert.note); }, [alert.note]);

  const commit = () => {
    setEditing(false);
    if (val !== alert.note) onSave(alert.alert_id, val);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setVal(alert.note); setEditing(false); }
        }}
        className="w-full bg-[#18181F] border border-[#6366F1] rounded px-1.5 py-0.5 text-[11px] text-[#F0F0F5] outline-none"
        placeholder="Add note…"
      />
    );
  }
  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-text min-h-[20px] px-1.5 py-0.5 rounded text-[11px] text-[#9090A0] hover:text-[#F0F0F5] hover:bg-[#18181F] transition-colors truncate max-w-[120px]"
      title={val || 'Click to add note'}
    >
      {val || <span className="opacity-30 italic">note…</span>}
    </div>
  );
}

// ── Sortable header ───────────────────────────────────────────────────────────

function SortableHeader({
  label, col, sortKey, sortDir, onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir | null;
  onSort: (col: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-widest whitespace-nowrap cursor-pointer select-none group"
      style={{
        color: active ? '#818CF8' : 'var(--color-text-muted)',
        backgroundColor: 'var(--color-surface-raised)',
      }}
    >
      <span className="flex items-center gap-1">
        {label}
        <span style={{ opacity: active ? 1 : 0.25 }} className="group-hover:opacity-70 transition-opacity">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

function PlainHeader({ label }: { label: string }) {
  return (
    <th className="px-2 py-2 text-left text-[9px] font-semibold uppercase tracking-widest whitespace-nowrap"
      style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-surface-raised)' }}>
      {label}
    </th>
  );
}

// ── Toggle button ─────────────────────────────────────────────────────────────

function Toggle<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: value === o.key ? 'var(--color-accent-dim)' : 'transparent',
            color: value === o.key ? '#818CF8' : 'var(--color-text-secondary)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const SCANNER_TABS: { key: AlertFilter; label: string }[] = [
  { key: 'ALL',       label: 'All' },
  { key: 'SHORTS',    label: 'Shorts' },
  { key: 'VOLUME',    label: 'Volume' },
  { key: 'SWEEP',     label: 'Sweep' },
  { key: 'HL',        label: 'H.Low' },
  { key: 'FAVORITES', label: '★ Fav' },
];

const DIR_OPTS   = [{ key: 'ALL' as const, label: 'All' }, { key: 'LONG' as const, label: '↑ Long' }, { key: 'SHORT' as const, label: '↓ Short' }];
const TF_OPTS    = [{ key: 'ALL' as const, label: 'All' }, { key: '15m' as const, label: '15m' }, { key: '1H' as const, label: '1H' }, { key: '4H' as const, label: '4H' }];
const EVAL_OPTS  = [{ key: 'ANY' as const, label: 'Any' }, { key: 'WIN' as const, label: 'Win' }, { key: 'LOSS' as const, label: 'Loss' }, { key: 'PENDING' as const, label: 'Pending' }];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  livePrices: Record<string, number>;
  onSymbolsChange?: (symbols: string[]) => void;
}

export default function LiveAlertsTable({ livePrices, onSymbolsChange }: Props) {
  const { alerts, connected, saveNote, toggleFavorite } = useAlerts();

  // Notify parent of unique symbols for live price fetching
  useEffect(() => {
    if (!onSymbolsChange) return;
    onSymbolsChange([...new Set(alerts.map(a => a.symbol))]);
  }, [alerts, onSymbolsChange]);

  // Re-render every 30s to refresh relative timestamps
  const [, forceRender] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [scannerTab, setScannerTab] = useState<AlertFilter>('ALL');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  function handleSort(col: SortKey) {
    if (sortKey !== col) { setSortKey(col); setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    setSortKey(null); setSortDir(null);
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }

  const hasActiveFilters =
    filters.direction !== 'ALL' ||
    filters.timeframe !== 'ALL' ||
    filters.eval !== 'ANY' ||
    filters.scoreMin !== '';

  // ── Filter + sort pipeline ─────────────────────────────────────────────────
  const visible = useMemo(() => {
    const scoreMinNum = filters.scoreMin !== '' ? parseFloat(filters.scoreMin) : null;

    let result = alerts.filter(a => {
      // Scanner tab
      if (scannerTab === 'FAVORITES') { if (!a.is_favorite) return false; }
      else if (scannerTab !== 'ALL') { if (a.scanner !== scannerTab) return false; }

      // Direction
      if (filters.direction !== 'ALL' && a.direction !== filters.direction) return false;

      // Timeframe
      if (filters.timeframe !== 'ALL' && a.timeframe !== filters.timeframe) return false;

      // Eval
      if (filters.eval !== 'ANY') {
        const best = bestEvalResult(a);
        if (filters.eval === 'WIN'     && best !== 'strong_win' && best !== 'weak_win') return false;
        if (filters.eval === 'LOSS'    && best !== 'loss') return false;
        if (filters.eval === 'PENDING' && best !== 'pending') return false;
      }

      // Score min
      if (scoreMinNum !== null && (a.score == null || a.score < scoreMinNum)) return false;

      return true;
    });

    // Sort
    if (sortKey && sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        let av: number | string | null = null;
        let bv: number | string | null = null;
        switch (sortKey) {
          case 'ts':          av = a.ts;           bv = b.ts;           break;
          case 'symbol':      av = a.symbol;       bv = b.symbol;       break;
          case 'scanner':     av = a.scanner;      bv = b.scanner;      break;
          case 'timeframe':   av = a.timeframe;    bv = b.timeframe;    break;
          case 'direction':   av = a.direction;    bv = b.direction;    break;
          case 'alert_price': av = a.alert_price;  bv = b.alert_price;  break;
          case 'score':       av = a.score ?? -1;  bv = b.score ?? -1;  break;
          case 'pctMove': {
            av = pctMove(a, livePrices) ?? -9999;
            bv = pctMove(b, livePrices) ?? -9999;
            break;
          }
          case 'tier': {
            av = TIER_RANK[a.tier ?? ''] ?? 0;
            bv = TIER_RANK[b.tier ?? ''] ?? 0;
            break;
          }
          case 'eval_15m': {
            av = EVAL_RANK[a.evals.find(e => e.horizon === '15m')?.result ?? 'pending'] ?? 0;
            bv = EVAL_RANK[b.evals.find(e => e.horizon === '15m')?.result ?? 'pending'] ?? 0;
            break;
          }
          case 'eval_1h': {
            av = EVAL_RANK[a.evals.find(e => e.horizon === '1H')?.result ?? 'pending'] ?? 0;
            bv = EVAL_RANK[b.evals.find(e => e.horizon === '1H')?.result ?? 'pending'] ?? 0;
            break;
          }
        }
        if (av === null || av === bv) return 0;
        if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
        return ((av as number) - (bv as number)) * dir;
      });
    } else {
      result = result.sort((a, b) => b.ts - a.ts);
    }

    return result;
  }, [alerts, scannerTab, filters, sortKey, sortDir, livePrices]);

  const evalFor = (a: ScannerAlert, h: string) => a.evals.find(e => e.horizon === h);

  // ── Separator ──────────────────────────────────────────────────────────────
  const sep = <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-surface-border)' }} />;

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* ── Header row 1: title + scanner tabs ─────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 gap-4 flex-wrap"
        style={{ borderBottom: '1px solid var(--color-surface-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Live Alerts
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
            style={{
              backgroundColor: connected ? 'var(--color-bullish-dim)' : 'var(--color-neutral-dim)',
              color: connected ? 'var(--color-bullish)' : 'var(--color-text-secondary)',
            }}
          >
            {connected ? `● LIVE  ${visible.length}` : '○ connecting…'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Scanner tabs */}
          <div className="flex items-center gap-0.5">
            {SCANNER_TABS.map(f => (
              <button
                key={f.key}
                onClick={() => setScannerTab(f.key)}
                className="px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: scannerTab === f.key ? 'var(--color-accent-dim)' : 'transparent',
                  color: scannerTab === f.key ? '#818CF8' : 'var(--color-text-secondary)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {sep}

          {/* Direction */}
          <Toggle value={filters.direction} options={DIR_OPTS} onChange={v => setFilter('direction', v)} />

          {sep}

          {/* Timeframe */}
          <Toggle value={filters.timeframe} options={TF_OPTS} onChange={v => setFilter('timeframe', v)} />

          {sep}

          {/* Eval */}
          <Toggle value={filters.eval} options={EVAL_OPTS} onChange={v => setFilter('eval', v)} />

          {sep}

          {/* Score min */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Score≥</span>
            <input
              ref={scoreInputRef}
              type="number"
              value={filters.scoreMin}
              onChange={e => setFilter('scoreMin', e.target.value)}
              placeholder="—"
              className="w-10 bg-transparent border rounded text-[10px] font-mono text-center outline-none px-1 py-0.5"
              style={{
                borderColor: filters.scoreMin ? '#6366F1' : 'var(--color-surface-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <>
              {sep}
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-[10px] px-2 py-0.5 rounded transition-colors"
                style={{ color: 'var(--color-bearish)', backgroundColor: 'var(--color-bearish-dim)' }}
              >
                ✕ clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '520px' }}>
        {visible.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
            {connected
              ? hasActiveFilters ? 'No alerts match the current filters' : 'No alerts yet — next scan in ≤15m'
              : 'Connecting to scanner…'}
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-surface-border)', position: 'sticky', top: 0, zIndex: 1 }}>
                <PlainHeader label="" />
                <SortableHeader label="Time"     col="ts"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Symbol"   col="symbol"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Scanner"  col="scanner"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="TF"       col="timeframe"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Dir"      col="direction"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <PlainHeader label="Signal Time" />
                <SortableHeader label="Price"    col="alert_price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="% Move"   col="pctMove"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Tier"     col="tier"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Score"    col="score"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <PlainHeader label="Tags" />
                <SortableHeader label="15m"      col="eval_15m"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="1H"       col="eval_1h"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <PlainHeader label="Notes" />
              </tr>
            </thead>
            <tbody>
              {visible.map((alert, idx) => {
                const isNew = Date.now() / 1000 - alert.ts < 120;
                const baseColor = isNew
                  ? 'rgba(99,102,241,0.05)'
                  : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
                return (
                  <tr
                    key={alert.alert_id}
                    className="group transition-colors"
                    style={{ backgroundColor: baseColor, borderBottom: '1px solid rgba(36,36,48,0.6)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = baseColor)}
                  >
                    {/* ★ Favorite */}
                    <td className="px-1.5 py-2 w-6">
                      <button
                        onClick={() => toggleFavorite(alert.alert_id)}
                        className="transition-colors text-[14px] leading-none"
                        style={{ color: alert.is_favorite ? '#F59E0B' : 'var(--color-surface-border)' }}
                      >
                        {alert.is_favorite ? '★' : '☆'}
                      </button>
                    </td>

                    {/* Time */}
                    <td className="px-2 py-2 whitespace-nowrap" title={fullTime(alert.ts)}>
                      <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-primary)' }}>
                        {relativeTime(alert.ts)}
                      </span>
                    </td>

                    {/* Symbol — clickable TV link */}
                    <td className="px-2 py-2">
                      <a
                        href={tvUrl(alert.symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-semibold text-[12px] hover:underline transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#818CF8')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                        title="Open in TradingView"
                      >
                        {alert.symbol.replace('USDT', '')}
                      </a>
                    </td>

                    {/* Scanner */}
                    <td className="px-2 py-2"><ScannerBadge scanner={alert.scanner} /></td>

                    {/* Timeframe */}
                    <td className="px-2 py-2">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-primary)' }}>
                        {alert.timeframe}
                      </span>
                    </td>

                    {/* Direction */}
                    <td className="px-2 py-2"><DirectionBadge dir={alert.direction} /></td>

                    {/* Signal Appearance Time */}
                    <td className="px-2 py-2 whitespace-nowrap" title={fullTime(alert.ts)}>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
                        {signalTime(alert.ts)}
                      </span>
                    </td>

                    {/* Alert price */}
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
                        {formatPrice(alert.alert_price)}
                      </span>
                    </td>

                    {/* % Move */}
                    <td className="px-2 py-2 whitespace-nowrap">
                      <PctMoveCell alert={alert} livePrices={livePrices} />
                    </td>

                    {/* Tier */}
                    <td className="px-2 py-2"><TierBadge tier={alert.tier} /></td>

                    {/* Score */}
                    <td className="px-2 py-2">
                      {alert.score != null
                        ? <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-primary)' }}>{alert.score.toFixed(0)}</span>
                        : <span style={{ color: 'var(--color-text-primary)' }} className="text-[10px]">—</span>}
                    </td>

                    {/* Tags */}
                    <td className="px-2 py-2 max-w-[140px]"><Tags alert={alert} /></td>

                    {/* 15m eval */}
                    <td className="px-2 py-2">
                      {evalFor(alert, '15m')
                        ? <EvalBadge result={evalFor(alert, '15m')!.result} />
                        : <span className="text-[#242430] text-[10px]">—</span>}
                    </td>

                    {/* 1H eval */}
                    <td className="px-2 py-2">
                      {evalFor(alert, '1H')
                        ? <EvalBadge result={evalFor(alert, '1H')!.result} />
                        : <span className="text-[#242430] text-[10px]">—</span>}
                    </td>

                    {/* Notes */}
                    <td className="px-1.5 py-2 min-w-[90px]">
                      <NoteCell alert={alert} onSave={saveNote} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
