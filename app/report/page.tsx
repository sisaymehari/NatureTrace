'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import { saveToOfflineQueue, flushOfflineQueue } from '@/lib/offline';
import type { Category, AIIdentifyResult } from '@/types';
import { CATEGORY_COLORS } from '@/types';
import toast from 'react-hot-toast';
import {
  Upload, MapPin, Loader2, AlertTriangle, CheckCircle, Camera, X
} from 'lucide-react';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'plant', label: 'Plant' },
  { value: 'marine', label: 'Marine' },
  { value: 'invasive', label: 'Invasive' },
];

export default function ReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category>('wildlife');
  const [speciesName, setSpeciesName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<AIIdentifyResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Flush offline queue when back online
  useEffect(() => {
    const flush = () => {
      flushOfflineQueue().then(() => toast.success('Offline reports uploaded!'));
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

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
        await identifySpecies(base64);
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
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        // Reverse geocode using nominatim
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await r.json();
          setLocationName(data.display_name?.split(',').slice(0, 3).join(', ') ?? '');
        } catch {}
        setGpsLoading(false);
      },
      () => {
        toast.error('Could not detect location');
        setGpsLoading(false);
      }
    );
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = photoFile.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const compress = (await import('browser-image-compression')).default;
    const compressed = await compress(photoFile, { maxSizeMB: 1, maxWidthOrHeight: 1200 });

    const { error } = await supabase.storage.from('reports').upload(path, compressed);
    if (error) throw error;

    const { data } = supabase.storage.from('reports').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) {
      toast.error('Please enter a species name');
      return;
    }

    if (!navigator.onLine) {
      saveToOfflineQueue({
        category,
        species_name: speciesName,
        description,
        photo_base64: photoBase64,
        latitude,
        longitude,
        location_name: locationName,
        queued_at: Date.now(),
      });
      toast('Saved offline. Will upload when connected.', { icon: '📶' });
      router.push('/');
      return;
    }

    setSubmitting(true);
    try {
      let url = photoUrl;
      if (!url && photoFile) {
        url = await uploadPhoto();
        setPhotoUrl(url);
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          species_name: speciesName,
          description,
          photo_url: url,
          latitude,
          longitude,
          location_name: locationName,
          ai_confidence: aiResult?.confidence ?? null,
          is_invasive: aiResult?.is_invasive ?? false,
          severity: aiResult?.is_invasive ? 'high' : 'low',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let msg = `Report submitted! +${data.eco_points_earned} pts`;
      if (data.badges_unlocked?.length > 0) {
        msg += ` 🏆 New badge${data.badges_unlocked.length > 1 ? 's' : ''}!`;
      }
      toast.success(msg, { duration: 4000 });
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Report</h1>
      <p className="text-gray-500 text-sm mb-6">Help protect UK biodiversity by reporting what you observe.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4" /> Photo
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
                    <Loader2 className="w-4 h-4 animate-spin" /> Identifying species…
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-emerald-400 transition-colors text-gray-400 hover:text-emerald-600"
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Upload photo</span>
              <span className="text-xs">AI will identify the species automatically</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
          />
        </div>

        {/* AI Result Card */}
        {aiResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-800 text-sm">AI Identification</span>
              <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {aiResult.confidence}% confidence
              </span>
            </div>
            <p className="font-bold text-gray-900">{aiResult.species_name}</p>
            <p className="text-xs text-gray-500 italic mb-2">{aiResult.scientific_name}</p>
            {aiResult.is_invasive && (
              <div className="flex items-center gap-1.5 text-red-700 text-xs mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-semibold">Invasive species detected</span>
              </div>
            )}
            <p className="text-xs text-gray-600">{aiResult.conservation_note}</p>
          </div>
        )}

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block font-semibold text-gray-800 mb-3">Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map(({ value, label }) => {
              const colors = CATEGORY_COLORS[value];
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    category === value
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Species & Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Species Name *</label>
            <input
              type="text"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              required
              placeholder="e.g. Red Kite"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what you observed…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </h2>
          <button
            type="button"
            onClick={detectLocation}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60 mb-3"
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {gpsLoading ? 'Detecting…' : 'Auto-detect GPS'}
          </button>
          {latitude && (
            <p className="text-xs text-gray-500 mb-2">
              {latitude.toFixed(5)}, {longitude?.toFixed(5)}
            </p>
          )}
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Or enter location name (e.g. Dartmoor, Devon)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || identifying}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
