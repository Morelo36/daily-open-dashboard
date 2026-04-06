/**
 * CriticalEventsPanel — Shows high-impact USD macro events this week.
 *
 * Data source: ForexFactory weekly calendar (fetched by api_server /api/events).
 * Times are displayed in Israel Daylight Time (UTC+3, active Apr–Oct).
 *
 * Only HIGH-impact USD events are shown — the ones that realistically move
 * crypto markets: FOMC, CPI, PCE, GDP, NFP, ISM PMI, Presidential speeches.
 */

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface EconEvent {
  title: string;
  time_il: string;   // "HH:MM" in Israel time
  date_il: string;   // "Mon Apr 07"
  is_today: boolean;
  forecast: string;
  previous: string;
  actual: string;
}

// ── Fetch hook ────────────────────────────────────────────────────────────────

function useEvents() {
  const [events, setEvents]   = useState<EconEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/events');
      if (!r.ok) throw new Error('bad response');
      const data: EconEvent[] = await r.json();
      setEvents(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30 * 60 * 1000); // refresh every 30 min
    return () => clearInterval(id);
  }, []);

  return { events, loading, error };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the event time has already passed today (Israel time). */
function isPast(ev: EconEvent): boolean {
  if (!ev.is_today) return false;
  const now = new Date();
  // Israel offset: UTC+3
  const ilHour = (now.getUTCHours() + 3) % 24;
  const ilMin  = now.getUTCMinutes();
  const [evH, evM] = ev.time_il.split(':').map(Number);
  return ilHour > evH || (ilHour === evH && ilMin >= evM);
}

/** Returns true if the event fires within the next 90 minutes. */
function isSoon(ev: EconEvent): boolean {
  if (!ev.is_today) return false;
  const now = new Date();
  const ilHour = (now.getUTCHours() + 3) % 24;
  const ilMin  = now.getUTCMinutes();
  const nowMinutes = ilHour * 60 + ilMin;
  const [evH, evM] = ev.time_il.split(':').map(Number);
  const evMinutes = evH * 60 + evM;
  const diff = evMinutes - nowMinutes;
  return diff >= 0 && diff <= 90;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EventRow({ ev }: { ev: EconEvent }) {
  const past = isPast(ev);
  const soon = isSoon(ev);
  const hasActual = !!ev.actual;

  // Colour scheme
  const timeColor = past
    ? 'var(--color-text-muted)'
    : soon
    ? 'var(--color-warning)'
    : ev.is_today
    ? 'var(--color-text-secondary)'
    : 'var(--color-text-muted)';

  const rowBg = soon
    ? 'rgba(245,158,11,0.06)'
    : 'transparent';

  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5"
      style={{
        borderBottom: '1px solid var(--color-surface-border)',
        backgroundColor: rowBg,
        opacity: past && !hasActual ? 0.45 : 1,
      }}
    >
      {/* Time column */}
      <div
        className="font-mono text-[11px] tabular-nums shrink-0 pt-[1px]"
        style={{ color: timeColor, minWidth: '38px' }}
      >
        {ev.time_il}
      </div>

      {/* Title + forecast/prev/actual */}
      <div className="flex flex-col gap-[2px] flex-1 min-w-0">
        <span
          className="text-[12px] font-sans leading-snug"
          style={{
            color: past ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            fontWeight: soon ? 600 : 400,
          }}
        >
          {ev.title}
        </span>

        {(ev.forecast || ev.previous || ev.actual) && (
          <div className="flex gap-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {ev.forecast && (
              <span>
                F: <span style={{ color: 'var(--color-text-secondary)' }}>{ev.forecast}</span>
              </span>
            )}
            {ev.previous && (
              <span>
                P: <span style={{ color: 'var(--color-text-secondary)' }}>{ev.previous}</span>
              </span>
            )}
            {ev.actual && (
              <span>
                A:{' '}
                <span
                  style={{
                    color: ev.forecast
                      ? parseFloat(ev.actual) >= parseFloat(ev.forecast)
                        ? 'var(--color-bullish)'
                        : 'var(--color-bearish)'
                      : 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {ev.actual}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Date label for upcoming events */}
        {!ev.is_today && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {ev.date_il}
          </span>
        )}
      </div>

      {/* "SOON" badge */}
      {soon && !hasActual && (
        <span
          className="shrink-0 text-[9px] px-1.5 py-[2px] rounded-sm font-mono tracking-wide"
          style={{
            backgroundColor: 'rgba(245,158,11,0.15)',
            color: 'var(--color-warning)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          SOON
        </span>
      )}
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-[6px]"
      style={{
        backgroundColor: 'var(--color-surface-overlay)',
        borderBottom: '1px solid var(--color-surface-border)',
      }}
    >
      <span
        className="text-[9px] uppercase tracking-widest font-sans"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[9px] font-mono"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CriticalEventsPanel() {
  const { events, loading, error } = useEvents();

  const today    = events.filter(e => e.is_today);
  const upcoming = events.filter(e => !e.is_today);

  return (
    <div
      className="rounded-[6px] overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface-raised)',
        border: '1px solid var(--color-surface-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-[10px]"
        style={{ borderBottom: '1px solid var(--color-surface-border)' }}
      >
        <Calendar size={12} style={{ color: 'var(--color-warning)' }} />
        <span
          className="text-[10px] uppercase tracking-widest font-sans"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Critical Events
        </span>
        <span
          className="text-[9px] font-sans"
          style={{ color: 'var(--color-text-muted)' }}
        >
          — Israel Time (IDT)
        </span>

        {/* USD HIGH badge */}
        <span
          className="ml-auto text-[9px] px-1.5 py-[2px] rounded-sm font-mono tracking-wide"
          style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            color: 'var(--color-bearish)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          USD · HIGH
        </span>
      </div>

      {/* Body */}
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {loading && (
          <div
            className="px-4 py-6 text-center text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Loading calendar…
          </div>
        )}

        {!loading && error && (
          <div
            className="px-4 py-6 text-center text-[11px]"
            style={{ color: 'var(--color-bearish)' }}
          >
            Calendar unavailable
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div
            className="px-4 py-6 text-center text-[11px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No high-impact USD events this week
          </div>
        )}

        {!loading && !error && today.length > 0 && (
          <>
            <SectionLabel label="Today" count={today.length} />
            {today.map((ev, i) => <EventRow key={i} ev={ev} />)}
          </>
        )}

        {!loading && !error && upcoming.length > 0 && (
          <>
            <SectionLabel label="This Week" count={upcoming.length} />
            {upcoming.map((ev, i) => <EventRow key={i} ev={ev} />)}
          </>
        )}
      </div>
    </div>
  );
}
