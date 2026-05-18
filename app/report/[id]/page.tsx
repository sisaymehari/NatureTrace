'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORY_COLORS } from '@/types';
import type { Category } from '@/types';
import {
  ArrowLeft, MapPin, Clock, CheckCircle, Loader, AlertTriangle,
  User, Leaf, BarChart2,
} from 'lucide-react';

interface ReportDetail {
  id: string;
  user_id: string;
  category: Category;
  species_name: string;
  description: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  ai_confidence: number | null;
  is_invasive: boolean;
  is_verified: boolean;
  severity: string;
  status: 'pending' | 'verified' | 'resolved';
  created_at: string;
  users?: { id: string; username: string; avatar_url: string | null; eco_points: number } | null;
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Loader },
  verified: { label: 'Verified', bg: 'bg-green-100',  text: 'text-green-800',  icon: CheckCircle },
  resolved: { label: 'Resolved', bg: 'bg-blue-100',   text: 'text-blue-800',   icon: CheckCircle },
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">{error ?? 'Report not found.'}</p>
        <button onClick={() => router.back()} className="text-emerald-600 hover:underline text-sm">
          ← Go back
        </button>
      </div>
    );
  }

  const colors = CATEGORY_COLORS[report.category];
  const status = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const date = new Date(report.created_at);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Hero photo */}
        {report.photo_url && (
          <img
            src={report.photo_url}
            alt={report.species_name}
            className="w-full h-72 object-cover"
          />
        )}

        <div className="p-6 space-y-6">
          {/* Header row: category + status */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {report.category.toUpperCase()}
            </span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.bg} ${status.text}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
          </div>

          {/* Species name */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.species_name}</h1>
            {report.is_invasive && (
              <div className="flex items-center gap-1.5 mt-1.5 text-red-600 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Invasive species
              </div>
            )}
          </div>

          {/* Description */}
          {report.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{report.description}</p>
          )}

          {/* AI confidence bar */}
          {report.ai_confidence != null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <BarChart2 className="w-4 h-4 text-emerald-600" />
                  AI Confidence
                </span>
                <span className="text-sm font-bold text-emerald-700">{report.ai_confidence}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${report.ai_confidence}%` }}
                />
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="border-gray-100" />

          {/* Location */}
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Location
            </h2>
            {report.location_name && (
              <p className="text-sm text-gray-600">{report.location_name}</p>
            )}
            {report.latitude != null && report.longitude != null && (
              <p className="text-xs text-gray-400 font-mono">
                {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
              </p>
            )}
            {!report.location_name && report.latitude == null && (
              <p className="text-sm text-gray-400">No location recorded</p>
            )}
          </div>

          {/* Date/time */}
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Submitted
            </h2>
            <p className="text-sm text-gray-600">
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' at '}
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Reporter */}
          {report.users && (
            <>
              <hr className="border-gray-100" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 flex-shrink-0">
                  {report.users.username?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{report.users.username ?? 'Unknown'}</p>
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Leaf className="w-3 h-3" />
                    {report.users.eco_points ?? 0} eco points
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
