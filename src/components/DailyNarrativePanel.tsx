import { AlertTriangle, Target } from 'lucide-react';
import type { DailyNarrative } from '../types/dashboard';

interface DailyNarrativePanelProps {
  data: DailyNarrative;
}

export default function DailyNarrativePanel({ data }: DailyNarrativePanelProps) {
  return (
    <div
      className="rounded-[6px] overflow-hidden"
      style={{
        border: '1px solid var(--color-surface-border)',
        backgroundColor: 'var(--color-surface-raised)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-surface-border)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-[10px] uppercase tracking-widest font-sans"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Daily Narrative
            </span>
            <span
              className="px-2 py-0.5 rounded-sm text-[10px] font-medium"
              style={{
                backgroundColor: 'var(--color-surface-overlay)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-surface-border)',
              }}
            >
              {data.sessionLabel}
            </span>
          </div>
          <p
            className="font-sans text-[14px] font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {data.headline}
          </p>
        </div>
        <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {data.date}
        </span>
      </div>

      {/* Body */}
      <div className="grid gap-0" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        {data.sections.map((section, i) => (
          <div
            key={section.title}
            className="px-5 py-4"
            style={{
              borderRight:
                i < data.sections.length - 1 ? '1px solid var(--color-surface-border)' : 'none',
            }}
          >
            <span
              className="block font-sans text-[10px] uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {section.title}
            </span>
            <p
              className="font-sans text-[12px] leading-[1.6]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {section.body}
            </p>
          </div>
        ))}
      </div>

      {/* Key Risks + Directive */}
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: '1fr auto',
          borderTop: '1px solid var(--color-surface-border)',
        }}
      >
        {/* Key Risks */}
        <div className="px-5 py-4" style={{ borderRight: '1px solid var(--color-surface-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={12} style={{ color: 'var(--color-warning)' }} />
            <span
              className="font-sans text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Key Risks
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {data.keyRisks.map((risk, i) => (
              <div key={i} className="flex gap-2">
                <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--color-warning)' }}>
                  {i + 1}.
                </span>
                <span className="font-sans text-[11px] leading-[1.5]" style={{ color: 'var(--color-text-secondary)' }}>
                  {risk}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trader Directive */}
        <div
          className="flex flex-col justify-center px-6 py-4 min-w-[320px] max-w-[420px]"
          style={{
            backgroundColor: 'var(--color-warning-dim)',
            borderLeft: '2px solid var(--color-warning)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target size={12} style={{ color: 'var(--color-warning)' }} />
            <span
              className="font-sans text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--color-warning-muted)' }}
            >
              Trader Directive
            </span>
          </div>
          <p
            className="font-sans text-[13px] font-semibold leading-[1.5]"
            style={{ color: 'var(--color-warning)' }}
          >
            {data.traderDirective}
          </p>
        </div>
      </div>
    </div>
  );
}
