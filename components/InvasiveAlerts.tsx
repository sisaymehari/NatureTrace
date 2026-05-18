'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Report } from '@/types';
import { createClient } from '@/lib/supabase';

const DURATION = 10_000;

export default function InvasiveAlerts() {
  const [alerts, setAlerts] = useState<Report[]>([]);

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    fetch('/api/reports?is_invasive=true&limit=3')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('invasive-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const r = payload.new as any;
          if (!r.is_invasive) return;
          setAlerts((prev) => {
            if (prev.find((a) => a.id === r.id)) return prev;
            return [{ ...r, latitude: null, longitude: null } as Report, ...prev].slice(0, 3);
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-2 left-0 right-0 z-[900] px-4 space-y-2 pointer-events-none">
      {alerts.map((report) => (
        <AlertBanner key={report.id} report={report} onDismiss={() => dismiss(report.id)} />
      ))}
    </div>
  );
}

function AlertBanner({ report, onDismiss }: { report: Report; onDismiss: () => void }) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), DURATION);
    const raf = requestAnimationFrame(() => {
      if (barRef.current) barRef.current.style.width = '0%';
    });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-auto bg-red-600 text-white rounded-xl shadow-lg overflow-hidden max-w-lg mx-auto">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Invasive species reported nearby</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{report.species_name}</p>
          {report.location_name && (
            <p className="text-xs text-red-200 mt-0.5 truncate">📍 {report.location_name}</p>
          )}
          <a
            href={`/report/${report.id}`}
            className="inline-block mt-1.5 text-xs font-semibold underline underline-offset-2 hover:text-red-100"
          >
            View report →
          </a>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-red-200 hover:text-white mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={barRef}
        className="h-1 bg-red-400"
        style={{ width: '100%', transition: `width ${DURATION}ms linear` }}
      />
    </div>
  );
}
