'use client';

import { useEffect, useRef, useState } from 'react';
import type { Report, Category } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { createClient } from '@/lib/supabase';
import { Search, X } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  initialReports: Report[];
  activeCategory: Category | 'all';
}

export default function Map({ initialReports, activeCategory }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const [reports, setReports] = useState<Report[]>(initialReports);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      await import('leaflet.markercluster');
      await import('leaflet.markercluster/dist/MarkerCluster.css');
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css');

      if (mapInstanceRef.current || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [54.5, -3.5],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      renderMarkers(L, map);
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const renderMarkers = async (L: any, map: any) => {
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }

    const cluster = (L as any).markerClusterGroup({ maxClusterRadius: 60 });

    const filtered = reports.filter(
      (r) => activeCategory === 'all' || r.category === activeCategory
    );

    filtered.forEach((report) => {
      if (!report.latitude || !report.longitude) return;

      const color = CATEGORY_COLORS[report.category]?.pin ?? '#1D6A48';

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      const popup = L.popup({ maxWidth: 280 }).setContent(
        createPopupHTML(report)
      );

      const marker = L.marker([report.latitude, report.longitude], { icon });
      marker.bindPopup(popup);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    markersRef.current = cluster;
  };

  const createPopupHTML = (report: Report) => {
    const colors = CATEGORY_COLORS[report.category];
    const badgeClass = colors
      ? `${colors.bg} ${colors.text} ${colors.border}`
      : 'bg-gray-100 text-gray-800 border-gray-300';
    const date = new Date(report.created_at).toLocaleDateString('en-GB');

    return `
      <div style="font-family:Arial,sans-serif;min-width:220px;border-radius:12px;overflow:hidden">
        ${report.photo_url ? `<img src="${report.photo_url}" alt="${report.species_name}" style="width:100%;height:140px;object-fit:cover" />` : ''}
        <div style="padding:12px">
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid;display:inline-block;margin-bottom:6px" class="${badgeClass}">
            ${report.category.toUpperCase()}
          </span>
          <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111">${report.species_name}</h3>
          <p style="margin:0 0 6px;font-size:12px;color:#555;line-height:1.4">${report.description?.slice(0, 100) ?? ''}${(report.description?.length ?? 0) > 100 ? '…' : ''}</p>
          <div style="font-size:11px;color:#888">${report.location_name ?? ''} · ${date}</div>
        </div>
      </div>
    `;
  };

  // Re-render markers when filter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then(({ default: L }) => {
      renderMarkers(L, mapInstanceRef.current);
    });
  }, [activeCategory, reports]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const newReport = payload.new as any;
          let lat: number | null = null;
          let lng: number | null = null;
          const loc = newReport.location;
          if (loc && typeof loc === 'string' && /^[0-9a-fA-F]+$/.test(loc)) {
            try {
              const bytes = Uint8Array.from({ length: loc.length / 2 }, (_, i) =>
                parseInt(loc.slice(i * 2, i * 2 + 2), 16)
              );
              const view = new DataView(bytes.buffer);
              const isLE = view.getUint8(0) === 1;
              const type = isLE ? view.getUint32(1, true) : view.getUint32(1, false);
              const hasSrid = !!(type & 0x20000000);
              const offset = 5 + (hasSrid ? 4 : 0);
              lng = view.getFloat64(offset, isLE);
              lat = view.getFloat64(offset + 8, isLE);
            } catch {}
          }
          setReports((prev) => [...prev, { ...newReport, latitude: lat, longitude: lng }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelect = (result: NominatimResult) => {
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    setSearchResults([]);
    mapInstanceRef.current?.flyTo(
      [parseFloat(result.lat), parseFloat(result.lon)],
      13,
      { animate: true, duration: 1 }
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Close dropdown when clicking outside the search box
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapRef} className="w-full h-full" />

      {/* Location search overlay */}
      <div
        ref={searchContainerRef}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-3"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a location…"
            className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 shadow-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              {isSearching
                ? <span className="block w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                : <X className="w-4 h-4" />}
            </button>
          )}
        </div>

        {showResults && (
          <ul className="mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {searchResults.length > 0
              ? searchResults.map((r) => (
                  <li
                    key={r.place_id}
                    onMouseDown={() => handleSelect(r)}
                    className="px-4 py-2.5 cursor-pointer hover:bg-emerald-50 border-b border-gray-50 last:border-0"
                  >
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {r.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {r.display_name.split(',').slice(1, 3).join(',')}
                    </div>
                  </li>
                ))
              : !isSearching && (
                  <li className="px-4 py-3 text-sm text-gray-400">No results found</li>
                )}
          </ul>
        )}
      </div>
    </div>
  );
}
