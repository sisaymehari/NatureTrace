'use client';

import { useEffect, useRef, useState } from 'react';
import type { Report, Category } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import { createClient } from '@/lib/supabase';
import { Search, X, LocateFixed, TreePine, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MIN_TREE_ZOOM = 14;

// Inline CSS colours for popup badges (Tailwind classes are dead inside Leaflet HTML strings)
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
  initialReports: Report[];
  activeCategory: Category | 'all';
}

export default function Map({ initialReports, activeCategory }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [locating, setLocating] = useState(false);

  // Map mode
  const [mapMode, setMapMode] = useState<'threats' | 'trees'>('threats');
  const mapModeRef = useRef<'threats' | 'trees'>('threats');
  const [treesLoading, setTreesLoading] = useState(false);
  const [treeStatusMsg, setTreeStatusMsg] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(6);
  const treeLayerRef = useRef<any>(null);
  const treeCacheRef = useRef<Record<string, any[]>>({});
  const treeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global handler for "Verify this tree" button inside Leaflet popup HTML
  useEffect(() => {
    (window as any).__nt_verifyTree = () => {
      toast.success('Thank you for verifying!');
    };
    return () => { delete (window as any).__nt_verifyTree; };
  }, []);

  // Keep mapModeRef in sync — must run before the mode-switch effect
  useEffect(() => {
    mapModeRef.current = mapMode;
  }, [mapMode]);

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
        const zoom = map.getZoom();

        if (mapModeRef.current === 'trees') {
          setCurrentZoom(zoom);

          if (zoom < MIN_TREE_ZOOM) {
            // Hide trees and cancel any pending fetch when zoomed out
            if (treeLayerRef.current) map.removeLayer(treeLayerRef.current);
            if (treeDebounceRef.current) clearTimeout(treeDebounceRef.current);
            setTreeStatusMsg(null);
            return;
          }

          if (treeDebounceRef.current) clearTimeout(treeDebounceRef.current);
          treeDebounceRef.current = setTimeout(() => {
            fetchAndRenderTrees(L, map);
          }, 800);
        }
      });
    };

    init();

    return () => {
      if (treeDebounceRef.current) clearTimeout(treeDebounceRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        LRef.current = null;
      }
    };
  }, []);

  const fetchAndRenderTrees = async (L: any, map: any) => {
    const zoom = map.getZoom();
    if (zoom < MIN_TREE_ZOOM) return;

    // Use actual viewport bounds
    const bounds = map.getBounds();
    const south = bounds.getSouth().toFixed(6);
    const north = bounds.getNorth().toFixed(6);
    const west  = bounds.getWest().toFixed(6);
    const east  = bounds.getEast().toFixed(6);

    const bboxKey = `${south},${west},${north},${east}`;

    if (treeCacheRef.current[bboxKey]) {
      const cached = treeCacheRef.current[bboxKey];
      renderTreeLayer(L, map, cached);
      setTreeStatusMsg(`${cached.length} tree${cached.length === 1 ? '' : 's'} found`);
      return;
    }

    setTreesLoading(true);
    setTreeStatusMsg('Loading trees from OpenStreetMap…');
    try {
      const query =
        `[out:json][timeout:30];` +
        `node["natural"="tree"](${south},${west},${north},${east});` +
        `out 500;`;

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const nodes: any[] = data.elements ?? [];
      treeCacheRef.current[bboxKey] = nodes;
      if (mapModeRef.current === 'trees') {
        renderTreeLayer(L, map, nodes);
        setTreeStatusMsg(`${nodes.length} tree${nodes.length === 1 ? '' : 's'} found`);
      }
    } catch (err) {
      console.error('[Trees] Overpass fetch failed:', err);
      toast.error('Could not load tree data — try again shortly.');
      setTreeStatusMsg(null);
    } finally {
      setTreesLoading(false);
    }
  };

  const renderTreeLayer = (L: any, map: any, nodes: any[]) => {
    if (treeLayerRef.current) map.removeLayer(treeLayerRef.current);
    const group = L.layerGroup();

    nodes.forEach((node: any) => {
      const { lat, lon, tags = {} } = node;
      const species: string | null =
        tags['species:en'] || tags['species'] || tags['name'] || null;

      const circle = L.circleMarker([lat, lon], {
        radius: 6,
        fillColor: '#2D9E4F',
        color: '#2D9E4F',
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.7,
      });

      const speciesRow = species
        ? `<p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#111827;line-height:1.3">${species}</p>`
        : `<p style="margin:0 0 3px;font-size:13px;color:#9CA3AF;font-style:italic">Common tree</p>`;

      circle.bindPopup(
        `<div style="font-family:system-ui,Arial,sans-serif;width:210px;padding:4px 2px">
          <div style="font-size:30px;text-align:center;margin-bottom:8px;line-height:1">🌳</div>
          ${speciesRow}
          <p style="margin:0 0 10px;font-size:11px;color:#9CA3AF">
            ${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}
          </p>
          <button
            onclick="window.__nt_verifyTree()"
            style="width:100%;background:#1D6A48;color:white;border:none;border-radius:8px;padding:7px 0;font-size:12px;font-weight:600;cursor:pointer"
            onmouseover="this.style.background='#155740'"
            onmouseout="this.style.background='#1D6A48'"
          >Verify this tree</button>
        </div>`,
        { maxWidth: 240 }
      );

      group.addLayer(circle);
    });

    group.addTo(map);
    treeLayerRef.current = group;
  };

  // React to mode toggle
  useEffect(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (mapMode === 'trees') {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      if (markersRef.current) map.removeLayer(markersRef.current);
      fetchAndRenderTrees(L, map);
    } else {
      if (treeLayerRef.current) map.removeLayer(treeLayerRef.current);
      setTreeStatusMsg(null);
      renderMarkers(L, map);
    }
  }, [mapMode]);

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
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
      });

      const popup = L.popup({ maxWidth: 280 }).setContent(createPopupHTML(report));
      const marker = L.marker([report.latitude, report.longitude], { icon });
      marker.bindPopup(popup);
      cluster.addLayer(marker);
    });

    markersRef.current = cluster;
    // Only add to map when in threats mode
    if (mapModeRef.current !== 'trees') {
      map.addLayer(cluster);
    }
  };

  const createPopupHTML = (report: Report) => {
    const badge = POPUP_BADGE[report.category] ?? { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' };
    const ago = timeAgo(report.created_at);

    return `
      <div style="font-family:system-ui,Arial,sans-serif;width:260px;overflow:hidden;margin:-1px">
        ${report.photo_url
          ? `<img src="${report.photo_url}" alt="${report.species_name}" style="width:100%;height:130px;object-fit:cover;display:block" />`
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
            ? `<p style="margin:0 0 8px;font-size:11px;color:#6B7280;display:flex;align-items:center;gap:3px">📍 ${report.location_name}</p>`
            : '<div style="margin-bottom:8px"></div>'}
          <a href="/report/${report.id}" style="font-size:12px;font-weight:600;color:#1D6A48;text-decoration:none">View details →</a>
        </div>
      </div>
    `;
  };

  // Re-render markers when filter or live reports change
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

  // Close search dropdown when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Derive tree status bar content
  const treeStatusBar = (() => {
    if (mapMode !== 'trees') return null;
    if (currentZoom < MIN_TREE_ZOOM) {
      return { icon: '🔍', text: 'Zoom in to see individual trees', color: 'text-gray-500' };
    }
    if (treesLoading) {
      return { icon: null, text: 'Loading trees from OpenStreetMap…', color: 'text-gray-500', spinner: true };
    }
    if (treeStatusMsg) {
      return { icon: '🌳', text: treeStatusMsg, color: 'text-emerald-700' };
    }
    return null;
  })();

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div ref={mapRef} className="w-full h-full" />

      {/* Mode toggle — top-right */}
      <div className="absolute top-3 right-3 z-[1000] flex rounded-xl overflow-hidden shadow-md border border-gray-200 bg-white">
        <button
          onClick={() => setMapMode('threats')}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            mapMode === 'threats'
              ? 'bg-emerald-700 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Report Threat
        </button>
        <div className="w-px bg-gray-200" />
        <button
          onClick={() => setMapMode('trees')}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            mapMode === 'trees'
              ? 'bg-emerald-700 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <TreePine className="w-3.5 h-3.5" />
          Explore Trees
          {treesLoading && (
            <span className="block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
        </button>
      </div>

      {/* Tree status bar — appears below the toggle in trees mode */}
      {treeStatusBar && (
        <div className="absolute top-14 right-3 z-[1000]">
          <div className={`bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-gray-200 text-xs font-medium flex items-center gap-1.5 ${treeStatusBar.color}`}>
            {treeStatusBar.spinner && (
              <span className="block w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin flex-shrink-0" />
            )}
            {treeStatusBar.icon && <span>{treeStatusBar.icon}</span>}
            {treeStatusBar.text}
          </div>
        </div>
      )}

      {/* Location search overlay — top-center */}
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

      {/* Locate me button — bottom-left, above Leaflet attribution */}
      <button
        onClick={handleLocate}
        disabled={locating}
        title="Go to my location"
        className="absolute bottom-8 left-3 z-[1000] w-9 h-9 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:border-emerald-400 transition-colors disabled:opacity-50"
      >
        {locating
          ? <span className="block w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
          : <LocateFixed className="w-4 h-4" />}
      </button>
    </div>
  );
}
