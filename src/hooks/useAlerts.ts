import { useEffect, useRef, useState, useCallback } from 'react';
import type { ScannerAlert } from '../types/alerts';

const API = '/api';

export function useAlerts() {
  const [alerts, setAlerts] = useState<ScannerAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Merge incoming alerts (newest first, deduplicated by alert_id)
  const mergeAlerts = useCallback((incoming: ScannerAlert[]) => {
    setAlerts(prev => {
      const map = new Map<string, ScannerAlert>();
      // existing first so incoming overrides (has fresher evals/meta)
      for (const a of prev) map.set(a.alert_id, a);
      for (const a of incoming) map.set(a.alert_id, a);
      return Array.from(map.values()).sort((a, b) => b.ts - a.ts);
    });
  }, []);

  useEffect(() => {
    const es = new EventSource(`${API}/alerts/stream`);
    esRef.current = es;

    es.addEventListener('init', (e: MessageEvent) => {
      try {
        const data: ScannerAlert[] = JSON.parse(e.data);
        setAlerts(data.sort((a, b) => b.ts - a.ts));
        setConnected(true);
      } catch { /* ignore */ }
    });

    es.addEventListener('alerts', (e: MessageEvent) => {
      try {
        const data: ScannerAlert[] = JSON.parse(e.data);
        mergeAlerts(data);
      } catch { /* ignore */ }
    });

    es.addEventListener('heartbeat', () => {
      setConnected(true);
    });

    es.onerror = () => {
      setConnected(false);
      // Browser will auto-reconnect for EventSource
    };

    return () => {
      es.close();
    };
  }, [mergeAlerts]);

  const saveNote = useCallback(async (alertId: string, note: string) => {
    // Optimistic update
    setAlerts(prev =>
      prev.map(a => a.alert_id === alertId ? { ...a, note } : a)
    );
    try {
      await fetch(`${API}/alerts/${alertId}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
    } catch { /* silently fail */ }
  }, []);

  const toggleFavorite = useCallback(async (alertId: string) => {
    setAlerts(prev =>
      prev.map(a =>
        a.alert_id === alertId
          ? { ...a, is_favorite: a.is_favorite ? 0 : 1 }
          : a
      )
    );
    const alert = alerts.find(a => a.alert_id === alertId);
    const newVal = alert ? !alert.is_favorite : true;
    try {
      await fetch(`${API}/alerts/${alertId}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: newVal }),
      });
    } catch { /* silently fail */ }
  }, [alerts]);

  return { alerts, connected, saveNote, toggleFavorite };
}
