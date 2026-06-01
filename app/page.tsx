'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import CategoryFilter from '@/components/CategoryFilter';
import InvasiveAlerts from '@/components/InvasiveAlerts';
import type { Category, Report } from '@/types';
import { MapPin, TreePine } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500 text-sm animate-pulse">Loading map…</div>
    </div>
  ),
});

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, species: 0 });

  useEffect(() => {
    fetch('/api/reports?limit=200')
      .then((r) => r.json())
      .then((data: Report[]) => {
        const arr = Array.isArray(data) ? data : [];
        setReports(arr);
        const unique = new Set(arr.map((r) => r.species_name));
        setStats({ total: arr.length, species: unique.size });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Stats + filter bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm z-10 flex items-center gap-3 px-4 py-2 text-sm text-gray-600">
        {/* Stats — fixed left */}
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
        {/* Filter pills — scrollable on mobile */}
        <div className="flex-1 overflow-x-auto min-w-0 scrollbar-hide">
          <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-sm animate-pulse">Loading reports…</div>
          </div>
        ) : (
          <MapComponent initialReports={reports} activeCategory={activeCategory} />
        )}
        <InvasiveAlerts />
      </div>

      {/* Floating submit button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <a
          href="/report"
          className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-semibold px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all text-sm active:scale-95"
        >
          + Submit a Report
        </a>
      </div>
    </div>
  );
}
