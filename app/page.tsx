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
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 z-10">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span><strong>{stats.total}</strong> reports</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TreePine className="w-4 h-4 text-emerald-600" />
          <span><strong>{stats.species}</strong> species</span>
        </div>
        <div className="ml-auto">
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
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition-all hover:shadow-xl text-sm"
        >
          + Submit a Report
        </a>
      </div>
    </div>
  );
}
