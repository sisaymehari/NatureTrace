'use client';

import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import type { Report, User } from '@/types';
import { BADGES, CATEGORY_COLORS, THREAT_CATEGORIES } from '@/types';
import {
  BarChart3, Users, TreePine, Trophy, AlertTriangle,
  CalendarDays, MapPin, Award, TrendingUp, TrendingDown, Minus,
  Download, Loader2,
} from 'lucide-react';

const RANK_STYLE = [
  { color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
  { color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200' },
  { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
] as const;

const THREAT_ICON: Record<string, string> = {
  habitat_destruction:     '🏚️',
  illegal_dumping:         '🚯',
  pollution:               '💧',
  environmental_emergency: '🔥',
};

const CHART_CATEGORIES = [
  'wildlife', 'plant', 'marine', 'invasive',
  'habitat_destruction', 'illegal_dumping', 'pollution', 'environmental_emergency',
] as const;

const CHART_LABELS: Record<string, string> = {
  wildlife:                'Wildlife',
  plant:                   'Plants',
  marine:                  'Marine',
  invasive:                'Invasive',
  habitat_destruction:     'Habitat',
  illegal_dumping:         'Dumping',
  pollution:               'Pollution',
  environmental_emergency: 'Emergency',
};

interface Stats {
  totalThisMonth:    number;
  totalLastMonth:    number;
  uniqueSpecies:     number;
  invasiveThisMonth: number;
  invasiveLastMonth: number;
  threatsThisMonth:  number;
  threatsLastMonth:  number;
  mostActiveRegion:  string | null;
  mostReportedSpecies: string | null;
  categoryCounts:    Record<string, number>;
}

function Trend({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return null;
  const diff = now - prev;
  if (diff > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <TrendingUp className="w-3 h-3" />+{diff} vs last month
    </span>
  );
  if (diff < 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
      <TrendingDown className="w-3 h-3" />{diff} vs last month
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="w-3 h-3" />Same as last month
    </span>
  );
}

export default function DashboardPage() {
  const [reports, setReports]       = useState<Report[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [exporting, setExporting]   = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const reportsRes = await fetch('/api/reports?limit=40');
      const reportsData: Report[] = await reportsRes.json().catch(() => []);
      setReports(Array.isArray(reportsData) ? reportsData : []);

      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: lb } = await supabase
        .from('users')
        .select('id, username, eco_points, badge_ids, reports_count')
        .order('eco_points', { ascending: false })
        .limit(10);
      setLeaderboard((lb as User[]) ?? []);

      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
      setMemberCount(count ?? 0);

      setLoading(false);
    };

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) setStats(await res.json());
      } catch {}
      setStatsLoading(false);
    };

    fetchData();
    fetchStats();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bioguard-reports-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const speciesReports = reports.filter((r) => !THREAT_CATEGORIES.includes(r.category));
  const threatReports  = reports.filter((r) => THREAT_CATEGORIES.includes(r.category));

  const maxCatCount = stats
    ? Math.max(1, ...CHART_CATEGORIES.map((c) => stats.categoryCounts[c] ?? 0))
    : 1;

  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long' });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Community Dashboard</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 text-sm font-medium bg-white border border-gray-200 hover:border-emerald-400 hover:text-emerald-700 text-gray-600 px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-60"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Reports
            </>
          )}
        </button>
      </div>

      {/* ── Impact stats ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          {monthName} Impact
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

          {/* Reports this month */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Reports This Month</span>
              <CalendarDays className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {statsLoading ? '…' : stats?.totalThisMonth ?? 0}
            </p>
            {stats && <Trend now={stats.totalThisMonth} prev={stats.totalLastMonth} />}
          </div>

          {/* Unique species */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Species Identified</span>
              <TreePine className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {statsLoading ? '…' : stats?.uniqueSpecies ?? 0}
            </p>
            <span className="text-xs text-gray-400">unique species (all time)</span>
          </div>

          {/* Invasive flagged */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Invasive Flagged</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {statsLoading ? '…' : stats?.invasiveThisMonth ?? 0}
            </p>
            {stats && <Trend now={stats.invasiveThisMonth} prev={stats.invasiveLastMonth} />}
          </div>

          {/* Threats reported */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Threats Reported</span>
              <BarChart3 className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {statsLoading ? '…' : stats?.threatsThisMonth ?? 0}
            </p>
            {stats && <Trend now={stats.threatsThisMonth} prev={stats.threatsLastMonth} />}
          </div>

          {/* Most active region */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Most Active Region</span>
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-base font-bold text-gray-900 leading-tight mt-1 truncate">
              {statsLoading ? '…' : (stats?.mostActiveRegion ?? '—')}
            </p>
            <span className="text-xs text-gray-400">by report volume</span>
          </div>

          {/* Most reported species */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">Top Species</span>
              <Award className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-base font-bold text-gray-900 leading-tight mt-1 truncate">
              {statsLoading ? '…' : (stats?.mostReportedSpecies ?? '—')}
            </p>
            <span className="text-xs text-gray-400">most reported</span>
          </div>
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Reports by Category
        </h2>
        {statsLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {CHART_CATEGORIES.map((cat) => {
              const count = stats?.categoryCounts[cat] ?? 0;
              const pct   = Math.round((count / maxCatCount) * 100);
              const pin   = CATEGORY_COLORS[cat]?.pin ?? '#6B7280';
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-500 text-right flex-shrink-0 truncate">
                    {CHART_LABELS[cat]}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, backgroundColor: pin }}
                    >
                      {count > 0 && (
                        <span className="text-white text-xs font-bold leading-none">{count}</span>
                      )}
                    </div>
                  </div>
                  {count === 0 && (
                    <span className="text-xs text-gray-300 w-4">0</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Community stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reports',   value: reports.length,       icon: BarChart3,     color: 'text-emerald-600' },
          { label: 'Species Sighted', value: new Set(speciesReports.map(r => r.species_name)).size, icon: TreePine, color: 'text-green-600' },
          { label: 'Threats Filed',   value: threatReports.length, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Members',         value: memberCount,          icon: Users,         color: 'text-blue-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {loading ? '…' : value}
                </p>
              </div>
              <div className={`${color} bg-gray-50 rounded-xl p-3`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sightings + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Sightings</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
              ))}
            </div>
          ) : speciesReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              No sightings yet. <a href="/report" className="text-emerald-600 hover:underline">Be the first!</a>
            </div>
          ) : (
            <div className="space-y-3">
              {speciesReports.slice(0, 10).map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Top Reporters
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="p-6 text-center text-gray-400 text-sm">No members yet</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {leaderboard.map((user, idx) => {
                  const rank = RANK_STYLE[idx];
                  const topBadgeId = user.badge_ids?.[user.badge_ids.length - 1];
                  const topBadge = topBadgeId ? BADGES[topBadgeId] : null;
                  return (
                    <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                      {rank ? (
                        <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full border ${rank.bg} ${rank.color} flex-shrink-0`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-xs font-bold w-8 text-center text-gray-400 flex-shrink-0">
                          {idx + 1}
                        </span>
                      )}
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                        {user.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {user.username ?? 'Unknown'}
                          </span>
                          {topBadge && (
                            <span title={topBadge.label} className="text-base leading-none flex-shrink-0">
                              {topBadge.icon}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span className="font-semibold text-emerald-600">{user.eco_points ?? 0} pts</span>
                          <span>·</span>
                          <span>{user.reports_count ?? 0} report{(user.reports_count ?? 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Threat reports ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" /> Environmental Threats
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
            ))}
          </div>
        ) : threatReports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400">
            No threats reported yet — <a href="/report" className="text-orange-600 hover:underline">report one now</a>.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {threatReports.slice(0, 6).map((r) => {
              const colors = CATEGORY_COLORS[r.category];
              const icon   = THREAT_ICON[r.category] ?? '⚠️';
              return (
                <a key={r.id} href={`/report/${r.id}`} className="block">
                  <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 hover:shadow-md transition-shadow`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl flex-shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold truncate ${colors.text}`}>{r.species_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{r.category.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    {r.location_name && (
                      <p className="text-xs text-gray-500 truncate">📍 {r.location_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
