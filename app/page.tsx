'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import CategoryFilter from '@/components/CategoryFilter';
import InvasiveAlerts from '@/components/InvasiveAlerts';
import type { Category, Report } from '@/types';
import { MapPin, TreePine, Shield } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-green-800 flex flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-3 text-white">
        <Shield className="w-9 h-9 opacity-90" />
        <span className="text-2xl font-bold tracking-tight">NatureTrace</span>
      </div>
      <div className="flex items-center gap-2 text-emerald-200 text-sm">
        <span className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin inline-block" />
        Loading map…
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 overflow-hidden">
        <div className="h-full bg-emerald-300 animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '40%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, species: 0 });
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetch('/api/reports?limit=200')
      .then((r) => r.json())
      .then((data: Report[]) => {
        const arr = Array.isArray(data) ? data : [];
        setReports(arr);
        const unique = new Set(arr.map((r) => r.species_name));
        setStats({ total: arr.length, species: unique.size });
      })
      .catch(console.error);
    // Signal map container ready after a short delay so fade-in is visible
    const t = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Filter / stats bar — slides down from top */}
      <div className="slide-down bg-white border-b border-gray-100 shadow-sm z-10">
        {/* Mobile: filter pills only */}
        <div className="md:hidden overflow-x-auto scrollbar-hide px-3 py-2">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} compact />
        </div>
        {/* Desktop: stats + filter pills */}
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

      {/* Map — fades in once ready */}
      <div className={`flex-1 relative transition-opacity duration-500 ${mapReady ? 'map-fade-in' : 'opacity-0'}`}>
        <MapComponent initialReports={reports} activeCategory={activeCategory} />
        <InvasiveAlerts />
      </div>

      {/* Floating submit button — pulses to draw attention */}
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
