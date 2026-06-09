'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import CategoryFilter from '@/components/CategoryFilter';
import InvasiveAlerts from '@/components/InvasiveAlerts';
import type { Category, Report } from '@/types';
import { MapPin, TreePine, Shield } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, species: 0 });
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashOut, setSplashOut] = useState(false);

  useEffect(() => {
    fetch('/api/reports?limit=50')
      .then((r) => r.json())
      .then((data: Report[]) => {
        const arr = Array.isArray(data) ? data : [];
        setReports(arr);
        const unique = new Set(arr.map((r) => r.species_name));
        setStats({ total: arr.length, species: unique.size });
      })
      .catch(console.error);

    // Start fading splash after 1s, remove from DOM after transition completes
    const fadeTimer = setTimeout(() => setSplashOut(true), 900);
    const hideTimer = setTimeout(() => setSplashVisible(false), 1500);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Branded splash overlay ────────────────────────────────────────── */}
      {splashVisible && (
        <div
          className="absolute inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-emerald-700 to-green-800 pointer-events-none"
          style={{ transition: 'opacity 0.6s ease', opacity: splashOut ? 0 : 1 }}
        >
          <div className="flex items-center gap-3 text-white">
            <Shield className="w-10 h-10 opacity-90" />
            <span className="text-2xl font-bold tracking-tight">NatureTrace</span>
          </div>
          <p className="text-emerald-200 text-sm">Protecting UK biodiversity</p>
          <div className="flex items-center gap-2 text-emerald-300 text-xs mt-2">
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-white rounded-full animate-spin inline-block" />
            Loading map…
          </div>
        </div>
      )}

      {/* Filter / stats bar — slides down from top */}
      <div className="slide-down bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="md:hidden overflow-x-auto scrollbar-hide px-3 py-2">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} compact />
        </div>
        <div className="hidden md:flex items-center gap-3 px-4 py-2 text-sm text-gray-600">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs"><strong>{stats.total}</strong> reports</span>
            </div>
            <div className="flex items-center gap-1">
              <TreePine className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs"><strong>{stats.species}</strong> species</span>
            </div>
          </div>
          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
          <div className="flex-1 overflow-x-auto min-w-0 scrollbar-hide">
            <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapComponent initialReports={reports} activeCategory={activeCategory} />
        <InvasiveAlerts />
      </div>

      {/* Floating submit button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <a
          href="/report"
          className="report-btn-pulse btn-press bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-semibold px-7 py-3.5 rounded-full shadow-lg transition-colors text-sm inline-block"
        >
          + Submit a Report
        </a>
      </div>
    </div>
  );
}
