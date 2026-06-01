'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Report } from '@/types';
import { createClient } from '@/lib/supabase';

const DURATION = 8_000;

export default function InvasiveAlerts() {
  const [alerts, setAlerts] = useState<Report[]>([]);

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((r) => r.id !== id));

  useEffect(() => {
    fetch('/api/reports?is_invasive=true&limit=3')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAlerts(data.slice(0, 3)); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('invasive-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const r = payload.new as any;
        if (!r.is_invasive) return;
        setAlerts((prev) => {
          if (prev.find((a) => a.id === r.id)) return prev;
          return [{ ...r, latitude: null, longitude: null } as Report, ...prev].slice(0, 3);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (alerts.length === 0) return null;

  return (
    /*
     * Mobile  : bottom 80px, full-width with horizontal padding, centered
     * Desktop : top 120px, right 10px, fixed 360px wide, z-index 800
     */
    <div className="fixed left-3 right-3 z-[1100] space-y-2 pointer-events-none
                    top-[210px] md:left-auto md:right-3 md:w-80 md:top-[168px]">
      {alerts.map((report, i) => (
        // 3rd banner hidden on mobile, visible on desktop
        <div key={report.id} className={i >= 2 ? 'hidden md:block' : ''}>
          <AlertBanner report={report} onDismiss={() => dismiss(report.id)} />
        </div>
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
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      className="alert-in pointer-events-auto bg-white rounded-xl overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.13)', border: '1px solid #fecaca' }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide leading-none">
            Invasive species nearby
          </p>
          <p className="text-sm font-bold text-gray-900 truncate mt-1">
            {report.species_name}
          </p>
          {report.location_name && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              📍 {report.location_name}
            </p>
          )}
          <a
            href={`/report/${report.id}`}
            className="inline-block mt-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View Report →
          </a>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shrinking progress bar */}
      <div
        ref={barRef}
        className="h-1 bg-red-400"
        style={{ width: '100%', transition: `width ${DURATION}ms linear` }}
      />
    </div>
  );
}
