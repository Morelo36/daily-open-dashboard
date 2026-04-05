import { useState, useEffect } from 'react';

// ── Holiday data (2025–2026) ──────────────────────────────────────────────────

const US_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
  '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
]);

const UK_HOLIDAYS = new Set([
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31', '2026-12-25', '2026-12-28',
]);

const ASIA_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
  '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
  '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24', '2025-12-31',
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-23',
  '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-31',
]);

// ── DST helpers ───────────────────────────────────────────────────────────────

// Returns true if a UTC Date is in US EDT (Eastern Daylight Time, UTC-4)
// EDT: 2nd Sunday of March → 1st Sunday of November
function isUSEDT(utc: Date): boolean {
  const year = utc.getUTCFullYear();
  // 2nd Sunday of March
  const springStart = nthSundayUTC(year, 2, 2); // month=2 (0-indexed March), n=2
  // 1st Sunday of November
  const fallEnd = nthSundayUTC(year, 10, 1);    // month=10 (0-indexed November), n=1
  return utc >= springStart && utc < fallEnd;
}

// Returns true if a UTC Date is in UK BST (British Summer Time, UTC+1)
// BST: last Sunday of March → last Sunday of October
function isUKBST(utc: Date): boolean {
  const year = utc.getUTCFullYear();
  const springStart = lastSundayUTC(year, 2); // last Sunday of March
  const fallEnd = lastSundayUTC(year, 9);     // last Sunday of October
  return utc >= springStart && utc < fallEnd;
}

// nth Sunday of a given UTC month (0-indexed). Returns midnight UTC.
function nthSundayUTC(year: number, month: number, n: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  // Advance to first Sunday
  d.setUTCDate(1 + ((7 - d.getUTCDay()) % 7));
  // Advance n-1 more weeks
  d.setUTCDate(d.getUTCDate() + (n - 1) * 7);
  return d;
}

// Last Sunday of a given UTC month (0-indexed). Returns midnight UTC.
function lastSundayUTC(year: number, month: number): Date {
  // Start from the last day of the month
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  lastDay.setUTCDate(lastDay.getUTCDate() - lastDay.getUTCDay()); // go back to Sunday
  return lastDay;
}

// ── Market open/close logic ───────────────────────────────────────────────────

interface MarketConfig {
  name: string;
  flag: string;
  holidays: Set<string>;
  // Returns { openMinutes, closeMinutes } as minutes from midnight UTC for a given UTC Date
  utcHours: (utc: Date) => { open: number; close: number };
}

const MARKETS: MarketConfig[] = [
  {
    name: 'US',
    flag: '🇺🇸',
    holidays: US_HOLIDAYS,
    utcHours: (utc) => isUSEDT(utc)
      ? { open: 13 * 60 + 30, close: 20 * 60 }   // EDT: 9:30–16:00 ET = 13:30–20:00 UTC
      : { open: 14 * 60 + 30, close: 21 * 60 },   // EST: 9:30–16:00 ET = 14:30–21:00 UTC
  },
  {
    name: 'UK',
    flag: '🇬🇧',
    holidays: UK_HOLIDAYS,
    utcHours: (utc) => isUKBST(utc)
      ? { open: 7 * 60, close: 15 * 60 + 30 }     // BST: 8:00–16:30 GMT+1 = 07:00–15:30 UTC
      : { open: 8 * 60, close: 16 * 60 + 30 },    // GMT: 8:00–16:30 = 08:00–16:30 UTC
  },
  {
    name: 'Asia',
    flag: '🇯🇵',
    holidays: ASIA_HOLIDAYS,
    utcHours: () => ({ open: 0 * 60, close: 6 * 60 + 30 }), // TSE: 9:00–15:30 JST = 0:00–6:30 UTC
  },
];

function dateKey(utc: Date): string {
  // Local date in UTC for holiday lookup (YYYY-MM-DD)
  return utc.toISOString().slice(0, 10);
}

function isWeekend(utc: Date): boolean {
  const day = utc.getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

interface MarketStatus {
  isOpen: boolean;
  label: string;       // 'closes in 2h 34m' | 'opens in 4h 12m' | 'opens Mon'
  countdown: string;   // formatted countdown or next open time
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getMarketStatus(market: MarketConfig, now: Date): MarketStatus {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const { open, close } = market.utcHours(now);
  const isHoliday = market.holidays.has(dateKey(now));
  const isOpen = !isWeekend(now) && !isHoliday && utcMinutes >= open && utcMinutes < close;

  if (isOpen) {
    const closeMs = (close - utcMinutes) * 60 * 1000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds();
    return { isOpen: true, label: 'OPEN', countdown: `closes in ${formatDuration(closeMs)}` };
  }

  // Find next open: advance day by day until we hit a trading day
  const nextOpen = findNextOpen(market, now);
  const diffMs = nextOpen.getTime() - now.getTime();
  const diffH = diffMs / 3600000;

  if (diffH < 24) {
    return { isOpen: false, label: 'CLOSED', countdown: `opens in ${formatDuration(diffMs)}` };
  }

  // More than 24h away — show day name
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[nextOpen.getUTCDay()];
  const hh = String(nextOpen.getUTCHours()).padStart(2, '0');
  const mm = String(nextOpen.getUTCMinutes()).padStart(2, '0');
  return { isOpen: false, label: 'CLOSED', countdown: `opens ${dayName} ${hh}:${mm} UTC` };
}

function findNextOpen(market: MarketConfig, from: Date): Date {
  // Start from tomorrow midnight UTC if currently past open, or today's open if before it
  const candidate = new Date(from);
  // Try up to 10 days ahead
  for (let i = 0; i < 10; i++) {
    const { open } = market.utcHours(candidate);
    const dayOpen = new Date(Date.UTC(
      candidate.getUTCFullYear(),
      candidate.getUTCMonth(),
      candidate.getUTCDate(),
      Math.floor(open / 60),
      open % 60,
      0, 0,
    ));

    const isHoliday = market.holidays.has(dateKey(candidate));
    const notWeekend = !isWeekend(candidate);

    if (notWeekend && !isHoliday && dayOpen > from) {
      return dayOpen;
    }

    // Advance to next day
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    candidate.setUTCHours(0, 0, 0, 0);
  }

  // Fallback (shouldn't happen)
  return new Date(from.getTime() + 7 * 86400000);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface TileStatus {
  market: MarketConfig;
  status: MarketStatus;
}

export default function MarketStatusBar() {
  const [statuses, setStatuses] = useState<TileStatus[]>(() =>
    MARKETS.map((m) => ({ market: m, status: getMarketStatus(m, new Date()) }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setStatuses(MARKETS.map((m) => ({ market: m, status: getMarketStatus(m, now) })));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto px-5 py-2"
      style={{
        backgroundColor: 'var(--color-surface-overlay)',
        borderBottom: '1px solid var(--color-surface-border)',
      }}
    >
      <span
        className="text-[9px] uppercase tracking-widest mr-4 shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Markets
      </span>

      {statuses.map(({ market, status }, i) => (
        <div key={market.name} className="flex items-center">
          {i > 0 && (
            <div
              className="self-stretch mx-4"
              style={{ width: '1px', backgroundColor: 'var(--color-surface-border)', margin: '2px 16px' }}
            />
          )}
          <MarketTile market={market} status={status} />
        </div>
      ))}
    </div>
  );
}

function MarketTile({ market, status }: { market: MarketConfig; status: MarketStatus }) {
  const openColor = '#22C55E';
  const closedColor = '#EF4444';
  const color = status.isOpen ? openColor : closedColor;
  const bg = status.isOpen ? '#14532d' : '#450a0a';

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <span className="text-[14px] leading-none">{market.flag}</span>
      <span
        className="font-mono text-[11px] font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {market.name}
      </span>
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
        style={{ color, backgroundColor: bg }}
      >
        ● {status.label}
      </span>
      <span
        className="font-mono text-[10px]"
        style={{ color: status.isOpen ? openColor : 'var(--color-text-secondary)' }}
      >
        {status.countdown}
      </span>
    </div>
  );
}
