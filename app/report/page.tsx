'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { saveToOfflineQueue, flushOfflineQueue } from '@/lib/offline';
import type { Category, AIIdentifyResult } from '@/types';
import { CATEGORY_COLORS, THREAT_CATEGORIES } from '@/types';
import toast from 'react-hot-toast';
import {
  Upload, MapPin, Loader2, AlertTriangle, CheckCircle, Camera, X, Search
} from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const SPECIES_CATS: { value: Category; label: string; icon: string; description: string }[] = [
  { value: 'wildlife', label: 'Wildlife',  icon: '🦊', description: 'Mammals, birds, reptiles' },
  { value: 'plant',    label: 'Plant',     icon: '🌿', description: 'Flora & vegetation' },
  { value: 'marine',   label: 'Marine',    icon: '🐬', description: 'Sea life & coastal' },
  { value: 'invasive', label: 'Invasive',  icon: '⚠️', description: 'Non-native species' },
];

const THREAT_CATS: { value: Category; label: string; icon: string; description: string }[] = [
  { value: 'habitat_destruction',     label: 'Habitat Loss', icon: '🏚️', description: 'Clearing, development' },
  { value: 'illegal_dumping',         label: 'Fly-tipping',  icon: '🚯', description: 'Unlawful waste disposal' },
  { value: 'pollution',               label: 'Pollution',    icon: '💧', description: 'Water, air or soil' },
  { value: 'environmental_emergency', label: 'Emergency',    icon: '🔥', description: 'Fire, spill, flood' },
];

const ALL_CATS = [...SPECIES_CATS, ...THREAT_CATS];

export default function ReportPage() {
  const router = useRouter();
  const fileRef    = useRef<HTMLInputElement>(null); // library (no capture)
  const cameraRef  = useRef<HTMLInputElement>(null); // camera direct

  const [category, setCategory] = useState<Category>('wildlife');
  const [speciesName, setSpeciesName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<AIIdentifyResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ speciesName: string; reportId: string } | null>(null);

  // Location autocomplete
  const [locResults, setLocResults] = useState<NominatimResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [showLocResults, setShowLocResults] = useState(false);
  const locDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locContainerRef = useRef<HTMLDivElement>(null);

  const isThreat = THREAT_CATEGORIES.includes(category);
  const { t } = useTranslation();

  // Clear AI result when switching to a threat category
  useEffect(() => {
    if (isThreat) setAiResult(null);
  }, [isThreat]);

  // Flush offline queue when back online
  useEffect(() => {
    const flush = () => {
      flushOfflineQueue().then(() => toast.success('Offline reports uploaded!'));
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (locContainerRef.current && !locContainerRef.current.contains(e.target as Node)) {
        setShowLocResults(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleLocationChange = (value: string) => {
    setLocationName(value);
    // Clear coordinates when user types manually
    setLatitude(null);
    setLongitude(null);
    if (locDebounceRef.current) clearTimeout(locDebounceRef.current);
    if (!value.trim()) { setLocResults([]); setShowLocResults(false); return; }
    locDebounceRef.current = setTimeout(async () => {
      setLocSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=0`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setLocResults(data);
        setShowLocResults(true);
      } catch {
        setLocResults([]);
      } finally {
        setLocSearching(false);
      }
    }, 500);
  };

  const handleLocationSelect = (result: NominatimResult) => {
    const parts = result.display_name.split(',');
    setLocationName(parts.slice(0, 3).join(',').trim());
    setLatitude(parseFloat(result.lat));
    setLongitude(parseFloat(result.lon));
    setLocResults([]);
    setShowLocResults(false);
  };

  const handlePhoto = async (file: File) => {
    setPhotoFile(file);
    try {
      const compress = (await import('browser-image-compression')).default;
      const compressed = await compress(file, { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true });
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setPhotoPreview(base64);
        setPhotoBase64(base64);
        if (!isThreat) await identifySpecies(base64);
      };
      reader.readAsDataURL(compressed);
    } catch {
      toast.error('Failed to process image');
    }
  };

  const identifySpecies = async (base64: string) => {
    setIdentifying(true);
    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, description, region: 'UK' }),
      });
      if (!res.ok) throw new Error('Identification failed');
      const result: AIIdentifyResult = await res.json();
      setAiResult(result);
      setSpeciesName(result.species_name);
      setCategory(result.category);
      toast.success('Species identified by AI!');
    } catch (err: any) {
      toast.error(err.message || 'Could not identify species');
    } finally {
      setIdentifying(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await r.json();
          setLocationName(data.display_name?.split(',').slice(0, 3).join(', ') ?? '');
        } catch {}
        setGpsLoading(false);
      },
      () => { toast.error('Could not detect location'); setGpsLoading(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) {
      toast.error(isThreat ? 'Please enter an incident title' : 'Please enter a species name');
      return;
    }

    if (!navigator.onLine) {
      saveToOfflineQueue({
        category, species_name: speciesName, description,
        photo_base64: photoBase64, latitude, longitude, location_name: locationName,
        queued_at: Date.now(),
      });
      toast('Saved offline. Will upload when connected.', { icon: '📶' });
      router.push('/');
      return;
    }

    setSubmitting(true);
    try {
      let photo_base64: string | null = null;
      if (photoBase64) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: photoBase64, mime_type: 'image/jpeg' }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Photo upload failed');
        // Strip data URI prefix — store raw base64 in the DB
        photo_base64 = (uploadData.base64 as string)?.replace(/^data:image\/\w+;base64,/, '') ?? null;
      }

      const severity = category === 'environmental_emergency' ? 'high'
        : isThreat ? 'medium'
        : (aiResult?.is_invasive ? 'high' : 'low');

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category, species_name: speciesName, description,
          photo_base64,
          latitude, longitude, location_name: locationName,
          ai_confidence: aiResult?.confidence ?? null,
          is_invasive: isThreat ? false : (aiResult?.is_invasive ?? false),
          severity,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Optimistic pin — map will show it immediately on next visit
      try {
        localStorage.setItem('naturetrace_pending_pin', JSON.stringify({
          id: data.report_id,
          category,
          species_name: speciesName,
          description,
          photo_url: null,
          photo_base64: photo_base64,
          latitude,
          longitude,
          location_name: locationName,
          ai_confidence: aiResult?.confidence ?? null,
          is_invasive: aiResult?.is_invasive ?? false,
          is_verified: false,
          severity,
          status: 'pending',
          created_at: new Date().toISOString(),
        }));
      } catch {}

      setSubmitted({ speciesName, reportId: data.report_id });
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const catInfo = ALL_CATS.find((c) => c.value === category);
  const colors = CATEGORY_COLORS[category];

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="success-pop text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report submitted!</h1>
          <p className="text-gray-500 mb-1 text-sm">Thank you for helping protect UK biodiversity.</p>
          <p className="text-emerald-700 font-semibold text-lg mb-8">{submitted.speciesName}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/')}
              className="btn-press w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              View on Map
            </button>
            <button
              onClick={() => {
                setSubmitted(null);
                setSpeciesName('');
                setDescription('');
                setPhotoPreview(null);
                setPhotoBase64(null);
                setAiResult(null);
                setLocationName('');
                setLatitude(null);
                setLongitude(null);
                setCategory('wildlife');
              }}
              className="btn-press w-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 rounded-xl transition-colors text-sm"
            >
              Submit another report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('report.title')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('report.subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4" /> {t('report.photoSection')}
          </h2>
          {photoPreview ? (
            <div className="relative">
              <div className="relative w-full h-56 rounded-lg overflow-hidden">
                <Image src={photoPreview} alt="Preview" fill className="object-cover" />
              </div>
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setPhotoFile(null); setPhotoBase64(null); setAiResult(null); }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
              {identifying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                  <div className="text-white text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('report.identifyingText')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile — two large tap targets */}
              <div className="flex md:hidden gap-3">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="btn-press flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-700 active:bg-emerald-100 shadow-sm"
                >
                  <span className="text-4xl">📷</span>
                  <span className="text-sm font-bold">Take Photo</span>
                  <span className="text-xs text-emerald-500">Use camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-press flex-1 flex flex-col items-center justify-center gap-3 py-8 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-700 active:bg-gray-100 shadow-sm"
                >
                  <span className="text-4xl">🖼️</span>
                  <span className="text-sm font-bold">From Library</span>
                  <span className="text-xs text-gray-400">Choose file</span>
                </button>
              </div>
              {/* Desktop — drag-and-drop zone */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="hidden md:flex w-full h-40 border-2 border-dashed border-gray-200 rounded-lg flex-col items-center justify-center gap-2 hover:border-emerald-400 transition-colors text-gray-400 hover:text-emerald-600"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">{t('report.uploadPhoto')}</span>
                <span className="text-xs">
                  {isThreat ? t('report.threatHint') : t('report.aiHint')}
                </span>
              </button>
            </>
          )}
          {/* Camera input — opens camera directly */}
          <input
            ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
          {/* Library input — opens photo picker */}
          <input
            ref={fileRef} type="file" accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
        </div>

        {/* AI Result Card */}
        {aiResult && !isThreat && (
          <div className="slide-in-down bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-800 text-sm">{t('report.aiIdentification')}</span>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {aiResult.confidence}% confidence
              </span>
            </div>
            <p className="font-bold text-gray-900">{aiResult.species_name}</p>
            <p className="text-xs text-gray-500 italic mb-2">{aiResult.scientific_name}</p>
            {aiResult.is_invasive && (
              <div className="flex items-center gap-1.5 text-red-700 text-xs mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">{t('report.invasiveDetected')}</span>
              </div>
            )}
            <p className="text-xs text-gray-600">{aiResult.conservation_note}</p>
          </div>
        )}

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block font-semibold text-gray-800 mb-3">{t('report.categoryLabel')}</label>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('report.speciesSighting')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {SPECIES_CATS.map(({ value, label, icon, description }) => {
              const c = CATEGORY_COLORS[value];
              const active = category === value;
              return (
                <button
                  key={value} type="button" onClick={() => setCategory(value)}
                  className={`cat-card py-2.5 px-2 rounded-lg text-sm font-medium border transition-all flex flex-col items-center gap-0.5 ${
                    active ? `${c.bg} ${c.text} ${c.border}` : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                  <span className={`text-xs ${active ? 'opacity-70' : 'text-gray-400'}`}>{description}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('report.envThreat')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {THREAT_CATS.map(({ value, label, icon, description }) => {
              const c = CATEGORY_COLORS[value];
              const active = category === value;
              return (
                <button
                  key={value} type="button" onClick={() => setCategory(value)}
                  className={`cat-card py-2.5 px-2 rounded-lg text-sm font-medium border transition-all flex flex-col items-center gap-0.5 ${
                    active ? `${c.bg} ${c.text} ${c.border}` : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-semibold">{label}</span>
                  <span className={`text-xs ${active ? 'opacity-70' : 'text-gray-400'}`}>{description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Threat notice */}
        {isThreat && (
          <div className={`${colors.bg} border ${colors.border} rounded-xl p-3 flex items-start gap-2`}>
            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colors.text}`} />
            <p className={`text-xs ${colors.text}`}>
              {t('report.threatNotice')}
            </p>
          </div>
        )}

        {/* Title & Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isThreat ? t('report.incidentTitle') : t('report.speciesName')}
            </label>
            <input
              type="text"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              required
              placeholder={isThreat ? `e.g. ${catInfo?.icon} Large chemical spill on riverbank` : 'e.g. Red Kite'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('report.descriptionLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={isThreat ? 'Describe the threat, its extent, and any immediate risks…' : 'Describe what you observed…'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {t('report.locationLabel')}
          </h2>
          <button
            type="button" onClick={detectLocation} disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60 mb-3"
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {gpsLoading ? t('report.detectingLocation') : t('report.useMyLocation')}
          </button>
          {latitude && longitude && (
            <p className="text-xs text-emerald-600 font-medium mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          )}

          {/* Location autocomplete */}
          <div ref={locContainerRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={locationName}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => locResults.length > 0 && setShowLocResults(true)}
              placeholder="Search for a place name…"
              className="w-full pl-9 pr-8 border border-gray-200 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {locationName && (
              <button
                type="button"
                onClick={() => { setLocationName(''); setLocResults([]); setShowLocResults(false); setLatitude(null); setLongitude(null); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear location"
              >
                {locSearching
                  ? <span className="block w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                  : <X className="w-4 h-4" />}
              </button>
            )}

            {showLocResults && (
              <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {locResults.length > 0
                  ? locResults.map((r) => (
                      <li
                        key={r.place_id}
                        onMouseDown={() => handleLocationSelect(r)}
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
                  : !locSearching && (
                      <li className="px-4 py-3 text-sm text-gray-400">No results found</li>
                    )}
              </ul>
            )}
          </div>
        </div>

        <button
          type="submit" disabled={submitting || identifying}
          className={`btn-press w-full font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-white ${
            isThreat ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-700 hover:bg-emerald-800'
          }`}
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('report.submitting')}</> : isThreat ? t('report.submitThreatBtn') : t('report.submitBtn')}
        </button>
      </form>
    </div>
  );
}
