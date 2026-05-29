'use client';

import { useState } from 'react';
import { LocateFixed, Loader2, RefreshCw } from 'lucide-react';

interface MetricsResult {
  treesNearby: number;
  nearestParkDistance: number | null;
  canopyCover: number;
  rating: 'Good' | 'Fair' | 'Poor';
  estimated?: boolean;
}

type Status = 'good' | 'fair' | 'poor';

interface Props {
  onResult?: (rating: 'Good' | 'Fair' | 'Poor') => void;
}

function MetricCircle({
  emoji,
  value,
  unit,
  label,
  target,
  status,
}: {
  emoji: string;
  value: string;
  unit: string;
  label: string;
  target: string;
  status: Status;
}) {
  const ring =
    status === 'good' ? 'border-green-500' :
    status === 'fair' ? 'border-amber-400' : 'border-red-400';
  const bg =
    status === 'good' ? 'bg-green-50' :
    status === 'fair' ? 'bg-amber-50' : 'bg-red-50';
  const valueColor =
    status === 'good' ? 'text-green-600' :
    status === 'fair' ? 'text-amber-600' : 'text-red-500';
  const dot =
    status === 'good' ? 'bg-green-500' :
    status === 'fair' ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[5px] ${ring} ${bg} flex flex-col items-center justify-center gap-0.5 shadow-sm`}>
        <span className="text-xl leading-none">{emoji}</span>
        <span className={`text-xl sm:text-2xl font-bold leading-tight ${valueColor}`}>{value}</span>
        <span className="text-[10px] sm:text-xs text-gray-400 leading-none">{unit}</span>
      </div>
      <div className="text-center">
        <p className="text-xs sm:text-sm font-semibold text-gray-700">{label}</p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <p className="text-[10px] sm:text-xs text-gray-400">Target: {target}</p>
        </div>
      </div>
    </div>
  );
}

const RATING_STYLE = {
  Good: 'bg-green-100 text-green-700 border-green-200',
  Fair: 'bg-amber-100 text-amber-700 border-amber-200',
  Poor: 'bg-red-100 text-red-700 border-red-200',
};

export default function TreeScoreCard({ onResult }: Props) {
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScore = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/metrics?lat=${coords.latitude}&lng=${coords.longitude}`
          );
          if (!res.ok) throw new Error('API error');
          const data: MetricsResult = await res.json();
          setMetrics(data);
          onResult?.(data.rating);
        } catch {
          setError('Could not load metrics. Try again.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied. Please allow location in your browser settings.');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const treeStatus  = (n: number): Status => n >= 3 ? 'good' : n >= 1 ? 'fair' : 'poor';
  const canopyStatus = (p: number): Status => p >= 30 ? 'good' : p >= 15 ? 'fair' : 'poor';
  const parkStatus  = (m: number | null): Status =>
    m === null ? 'poor' : m <= 300 ? 'good' : m <= 600 ? 'fair' : 'poor';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            3-30-300 Score
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Urban forestry standard — Konijnendijk, 2022
          </p>
        </div>
        {metrics && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${RATING_STYLE[metrics.rating]}`}>
            {metrics.rating}
          </span>
        )}
      </div>

      {/* Pre-load state */}
      {!metrics && !loading && (
        <div className="flex flex-col items-center py-7 gap-4">
          <p className="text-sm text-gray-500 text-center max-w-sm leading-relaxed">
            Every person should see <strong>3 trees</strong> from home, live in a neighbourhood
            with <strong>30% canopy cover</strong>, and be within <strong>300m of a park</strong>.
          </p>
          <button
            onClick={getScore}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-sm font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-all"
          >
            <LocateFixed className="w-4 h-4" />
            Get my score
          </button>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
          <p className="text-sm text-gray-500">Analysing your area…</p>
        </div>
      )}

      {/* Results */}
      {metrics && !loading && (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-5 mb-4">
            <MetricCircle
              emoji="🌳"
              value={String(metrics.treesNearby)}
              unit="trees"
              label="Trees visible"
              target="3+"
              status={treeStatus(metrics.treesNearby)}
            />
            <MetricCircle
              emoji="🌲"
              value={`${metrics.canopyCover}%`}
              unit="cover"
              label="Canopy cover"
              target="30%"
              status={canopyStatus(metrics.canopyCover)}
            />
            <MetricCircle
              emoji="🏃"
              value={metrics.nearestParkDistance !== null ? String(metrics.nearestParkDistance) : '—'}
              unit="metres"
              label="Nearest park"
              target="≤ 300m"
              status={parkStatus(metrics.nearestParkDistance)}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400">
              {metrics.estimated
                ? '⚠️ Live data unavailable — showing UK urban estimates'
                : 'Based on the 3-30-300 urban forestry standard (Konijnendijk, 2022)'}
            </p>
            <button
              onClick={getScore}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
