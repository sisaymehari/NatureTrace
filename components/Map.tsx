'use client';

import { useEffect, useRef, useState } from 'react';
import type { Report, Category } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { createClient } from '@/lib/supabase';
import { Search, X, LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import { HYDE_PARK_TREES, HYDE_PARK_BOUNDS } from '@/lib/hyde-park-trees';

// ─── Popup badge styles ───────────────────────────────────────────────────────
const POPUP_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  wildlife:                { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  plant:                   { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
  marine:                  { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE' },
  invasive:                { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  habitat_destruction:     { bg: '#FFEDD5', color: '#9A3412', border: '#FED7AA' },
  illegal_dumping:         { bg: '#FEF9C3', color: '#854D0E', border: '#FEF08A' },
  pollution:               { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' },
  environmental_emergency: { bg: '#FFE4E6', color: '#881337', border: '#FECDD3' },
};

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  initialReports?: Report[];
  activeCategory?: Category | 'all';
}

export default function MapComponent({ initialReports = [], activeCategory = 'all' }: Props = {}) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef     = useRef<any>(null);
  const LRef           = useRef<any>(null);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [locating, setLocating] = useState(false);

  // Map mode
  const [mapMode, setMapMode]   = useState<'threats' | 'trees'>('threats');
  const mapModeRef              = useRef<'threats' | 'trees'>('threats');
  const [treeStatusMsg, setTreeStatusMsg] = useState<string | null>(null);
  const treeLayerRef = useRef<any>(null);

  // Search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const searchDebounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as any).__nt_verifyTree = () => toast.success('Thanks for verifying!');
    return () => { delete (window as any).__nt_verifyTree; };
  }, []);

  useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);

  // ── Map init ────────────────────────────────────────────────────────────────
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
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      LRef.current = L;
      mapInstanceRef.current = map;
      renderMarkers(L, map);

      map.on('moveend', () => {
        if (mapModeRef.current === 'trees') loadHydeParkTrees(L, map);
      });
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        LRef.current = null;
      }
    };
  }, []);

  // ── Hyde Park static tree layer ─────────────────────────────────────────────
  const loadHydeParkTrees = (L: any, map: any) => {
    const b = map.getBounds();
    const overlaps =
      b.getSouth() < HYDE_PARK_BOUNDS.north && b.getNorth() > HYDE_PARK_BOUNDS.south &&
      b.getWest()  < HYDE_PARK_BOUNDS.east  && b.getEast()  > HYDE_PARK_BOUNDS.west;

    if (!overlaps) {
      if (treeLayerRef.current) { map.removeLayer(treeLayerRef.current); treeLayerRef.current = null; }
      setTreeStatusMsg('Tree data available for Hyde Park demo area. Zoom to Hyde Park to explore.');
      return;
    }

    if (treeLayerRef.current) map.removeLayer(treeLayerRef.current);
    const group = L.layerGroup();

    HYDE_PARK_TREES.forEach((tree) => {
      const species = tree.species ?? 'Tree';
      const circle = L.circleMarker([tree.lat, tree.lng], {
        radius: 6,
        fillColor: '#2D9E4F',
        color: '#2D9E4F',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8,
      });
      circle.bindPopup(
        `<div style="font-family:system-ui,Arial,sans-serif;min-width:140px;padding:2px 0">
          <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;line-height:1.3">${species}</p>
          <button
            onclick="window.__nt_verifyTree()"
            style="width:100%;background:#1D6A48;color:white;border:none;border-radius:8px;padding:7px 0;font-size:13px;font-weight:600;cursor:pointer"
            onmouseover="this.style.background='#155740'"
            onmouseout="this.style.background='#1D6A48'"
          >✓ Verify</button>
        </div>`,
        { maxWidth: 200 }
      );
      group.addLayer(circle);
    });

    group.addTo(map);
    treeLayerRef.current = group;
    setTreeStatusMsg('🌳 200 trees mapped — Hyde Park demo');
  };

  // ── Mode switch effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (mapMode === 'trees') {
      if (markersRef.current) map.removeLayer(markersRef.current);
      loadHydeParkTrees(L, map);
    } else {
      if (treeLayerRef.current) { map.removeLayer(treeLayerRef.current); treeLayerRef.current = null; }
      setTreeStatusMsg(null);
      renderMarkers(L, map);
    }
  }, [mapMode]);

  // ── Threat markers ──────────────────────────────────────────────────────────
  const renderMarkers = async (L: any, map: any) => {
    if (markersRef.current) map.removeLayer(markersRef.current);

    const cluster = (L as any).markerClusterGroup({ maxClusterRadius: 60 });
    const filtered = reports.filter(
      (r) => activeCategory === 'all' || r.category === activeCategory
    );

    filtered.forEach((report) => {
      if (!report.latitude || !report.longitude) return;
      const color = CATEGORY_COLORS[report.category]?.pin ?? '#1D6A48';
      const icon = L.divIcon({
        html: `<div class="marker-fade-in" style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
      });
      const marker = L.marker([report.latitude, report.longitude], { icon });
      marker.bindPopup(L.popup({ maxWidth: 280 }).setContent(createPopupHTML(report)));
      cluster.addLayer(marker);
    });

    markersRef.current = cluster;
    if (mapModeRef.current !== 'trees') map.addLayer(cluster);
  };

  const createPopupHTML = (report: Report) => {
    const badge = POPUP_BADGE[report.category] ?? { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
    const ago = timeAgo(report.created_at);
    return `
      <div style="font-family:system-ui,Arial,sans-serif;width:260px;overflow:hidden;margin:-1px">
        ${report.photo_url || report.photo_base64
          ? `<img src="${report.photo_url ?? `data:image/jpeg;base64,${report.photo_base64}`}" alt="${report.species_name}" style="width:100%;height:130px;object-fit:cover;display:block" />`
          : ''}
        <div style="padding:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:999px;background:${badge.bg};color:${badge.color};border:1px solid ${badge.border}">
              ${report.category.toUpperCase()}
            </span>
            <span style="font-size:11px;color:#9CA3AF">${ago}</span>
          </div>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827;line-height:1.3">${report.species_name}</p>
          ${report.location_name
            ? `<p style="margin:0 0 8px;font-size:11px;color:#6B7280">📍 ${report.location_name}</p>`
            : '<div style="margin-bottom:8px"></div>'}
          <a href="/report/${report.id}" style="font-size:12px;font-weight:600;color:#1D6A48;text-decoration:none">View details →</a>
        </div>
      </div>`;
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import('leaflet').then(({ default: L }) => renderMarkers(L, mapInstanceRef.current));
  }, [activeCategory, reports]);

  // ── Supabase Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        const r = payload.new as any;
        let lat: number | null = null, lng: number | null = null;
        const loc = r.location;
        if (loc && typeof loc === 'string' && /^[0-9a-fA-F]+$/.test(loc)) {
          try {
            const bytes = Uint8Array.from({ length: loc.length / 2 }, (_, i) =>
              parseInt(loc.slice(i * 2, i * 2 + 2), 16));
            const view = new DataView(bytes.buffer);
            const isLE = view.getUint8(0) === 1;
            const type = isLE ? view.getUint32(1, true) : view.getUint32(1, false);
            const hasSrid = !!(type & 0x20000000);
            const offset = 5 + (hasSrid ? 4 : 0);
            lng = view.getFloat64(offset, isLE);
            lat = view.getFloat64(offset + 8, isLE);
          } catch {}
        }
        setReports((prev) => [...prev, { ...r, latitude: lat, longitude: lng }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setSearchResults(await res.json());
        setShowResults(true);
      } catch { setSearchResults([]); } finally { setIsSearching(false); }
    }, 500);
  };

  const handleSelect = (r: NominatimResult) => {
    setSearchQuery(r.display_name.split(',')[0]);
    setShowResults(false); setSearchResults([]);
    mapInstanceRef.current?.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 13, { animate: true, duration: 1 });
  };

  const clearSearch = () => { setSearchQuery(''); setSearchResults([]); setShowResults(false); };

  const handleLocate = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        mapInstanceRef.current.flyTo([coords.latitude, coords.longitude], 14, { animate: true, duration: 1 });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Derived status bar ──────────────────────────────────────────────────────
  const statusBar = (() => {
    if (mapMode !== 'trees' || !treeStatusMsg) return null;
    const isDemo = treeStatusMsg.startsWith('🌳');
    return { text: treeStatusMsg, color: isDemo ? 'text-emerald-700' : 'text-gray-500' };
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Map canvas fills container */}
      <div ref={mapRef} className="absolute inset-0" />

      {/*
       * Single overlay wrapper with zIndex above ALL Leaflet internals.
       * Leaflet tiles/markers use z-index 200-900 internally.
       * pointer-events:none on wrapper; restored per-element below.
       */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>

        {/* Search — full width on mobile, centred on desktop */}
        <div
          ref={searchContainerRef}
          className="absolute top-3 left-3 right-3 pointer-events-auto
                     md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-sm md:px-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search for a location…"
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-gray-200 shadow-lg bg-white/95 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear">
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
                    <li key={r.place_id} onMouseDown={() => handleSelect(r)}
                      className="px-4 py-2.5 cursor-pointer hover:bg-emerald-50 border-b border-gray-50 last:border-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.display_name.split(',')[0]}</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">{r.display_name.split(',').slice(1, 3).join(',')}</div>
                    </li>
                  ))
                : !isSearching && <li className="px-4 py-3 text-sm text-gray-400">No results found</li>}
            </ul>
          )}
        </div>

        {/*
         * Toggle pill:
         *   mobile  — below search (top-[58px], search is top-3 + ~42px tall)
         *   desktop — top-right beside search (md:top-3)
         */}
        <div className="absolute top-[58px] right-3 pointer-events-auto md:top-3">
          <div className="flex bg-white/95 backdrop-blur-sm rounded-full p-1 shadow-md border border-gray-200">
            <button
              onClick={() => setMapMode('threats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mapMode === 'threats' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>⚠️</span> Report
            </button>
            <button
              onClick={() => setMapMode('trees')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mapMode === 'trees' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>🌳</span> Explore
            </button>
          </div>
        </div>

        {/* Tree status pill — below toggle */}
        {statusBar && (
          <div className="absolute top-[104px] right-3 pointer-events-auto md:top-[58px]">
            <div className={`bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-md border border-gray-200 text-xs font-medium ${statusBar.color}`}>
              {statusBar.text}
            </div>
          </div>
        )}

        {/* Locate me — bottom-left */}
        <button
          onClick={handleLocate}
          disabled={locating}
          title="Go to my location"
          className="absolute bottom-8 left-3 pointer-events-auto w-9 h-9 bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:border-emerald-400 transition-colors disabled:opacity-50"
        >
          {locating
            ? <span className="block w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
            : <LocateFixed className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
