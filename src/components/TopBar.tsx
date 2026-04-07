import { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, Plus, X } from 'lucide-react';
import type { CoinSnapshot } from '../types/dashboard';

interface TopBarProps {
  coins: CoinSnapshot[];
  onAddCoin: (symbol: string) => Promise<'ok' | string>;
  onRemoveCoin: (symbol: string) => void;
  onRefresh: () => void;
  lastUpdated: string;
  dataStatus?: string;
}

const MODES = ['Intraday', 'Swing', 'Daily'] as const;
const PRESETS = ['My Watchlist', 'BTC Focus', 'Alt Season'] as const;

export default function TopBar({ coins, onAddCoin, onRemoveCoin, onRefresh, lastUpdated, dataStatus }: TopBarProps) {
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<typeof MODES[number]>('Intraday');
  const [preset, setPreset] = useState<typeof PRESETS[number]>('My Watchlist');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const updatedAgo = (() => {
    const diff = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / 60000);
    if (diff < 1) return 'just now';
    return `${diff}m ago`;
  })();

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-surface-border)',
      }}
      className="sticky top-0 z-50 px-6 py-0 flex items-center justify-between gap-4 min-h-[52px]"
    >
      {/* Left: branding */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/neo-logo.png" alt="NEO" className="h-8 w-auto object-contain" />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-primary)' }}>
            Updated {updatedAgo}
          </span>
          {dataStatus === 'live' && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-bullish)', boxShadow: '0 0 4px var(--color-bullish)' }}
            />
          )}
        </div>

        <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--color-surface-border)' }} />

        {/* Date + time */}
        <div className="flex flex-col">
          <span className="font-mono text-[11px]" style={{ color: 'var(--color-text-primary)' }}>
            {dateStr}
          </span>
          <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {timeStr} UTC
          </span>
        </div>
      </div>

      {/* Center: mode + preset */}
      <div className="flex items-center gap-2">
        <Select label="Mode" value={mode} options={MODES} onChange={(v) => setMode(v as typeof mode)} />
        <Select label="Preset" value={preset} options={PRESETS} onChange={(v) => setPreset(v as typeof preset)} />

        {/* Today Focus badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-sm text-[11px] font-medium"
          style={{
            backgroundColor: 'var(--color-accent-dim)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
          }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Focus</span>
          <span>SOL</span>
        </div>
      </div>

      {/* Right: coin chips + add + refresh */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {coins.map((c) => (
            <CoinChip key={c.symbol} symbol={c.symbol} onRemove={() => onRemoveCoin(c.symbol)} />
          ))}
          <div className="relative">
            <button
              onClick={() => setShowAddPanel(!showAddPanel)}
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-overlay)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-surface-border)',
              }}
            >
              <Plus size={11} />
              <span>Add</span>
            </button>
            {showAddPanel && (
              <div
                className="absolute right-0 top-full mt-1 p-2 rounded-sm z-10 flex flex-col gap-1"
                style={{
                  backgroundColor: 'var(--color-surface-overlay)',
                  border: '1px solid var(--color-surface-border)',
                  minWidth: '200px',
                }}
              >
                <div className="flex gap-1">
                  <input
                    value={addInput}
                    onChange={(e) => { setAddInput(e.target.value.toUpperCase()); setAddError(null); }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && addInput.trim() && !addLoading) {
                        setAddLoading(true);
                        setAddError(null);
                        const result = await onAddCoin(addInput.trim());
                        setAddLoading(false);
                        if (result === 'ok') {
                          setShowAddPanel(false);
                          setAddInput('');
                        } else {
                          setAddError(result ?? 'Not found on Bybit');
                        }
                      }
                      if (e.key === 'Escape') { setShowAddPanel(false); setAddInput(''); setAddError(null); }
                    }}
                    placeholder="e.g. DOGE"
                    className="flex-1 px-2 py-1 rounded-sm text-[11px] outline-none"
                    style={{
                      backgroundColor: 'var(--color-surface-border)',
                      color: 'var(--color-text-primary)',
                      opacity: addLoading ? 0.5 : 1,
                    }}
                    disabled={addLoading}
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!addInput.trim() || addLoading) return;
                      setAddLoading(true);
                      setAddError(null);
                      const result = await onAddCoin(addInput.trim());
                      setAddLoading(false);
                      if (result === 'ok') { setShowAddPanel(false); setAddInput(''); }
                      else setAddError(result ?? 'Not found on Bybit');
                    }}
                    disabled={!addInput.trim() || addLoading}
                    className="px-2 py-1 rounded-sm text-[11px] font-semibold transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  >
                    {addLoading ? '…' : 'Add'}
                  </button>
                </div>
                {addError && (
                  <span className="text-[10px]" style={{ color: 'var(--color-bearish)' }}>{addError}</span>
                )}
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Enter symbol then click Add or press Enter
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-surface-border)' }} />

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--color-text-muted)' }}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="appearance-none pl-2 pr-5 py-1 rounded-sm text-[11px] cursor-pointer outline-none"
          style={{
            backgroundColor: 'var(--color-surface-overlay)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-surface-border)',
          }}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown
          size={10}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
    </div>
  );
}

function CoinChip({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-sm text-[11px]"
      style={{
        backgroundColor: 'var(--color-surface-overlay)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      <span className="font-mono font-medium">{symbol}</span>
      <button
        onClick={onRemove}
        className="transition-opacity hover:opacity-70"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X size={9} />
      </button>
    </div>
  );
}
