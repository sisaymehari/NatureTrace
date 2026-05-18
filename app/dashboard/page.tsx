'use client';

import { useState, useEffect } from 'react';
import ReportCard from '@/components/ReportCard';
import type { Report, User } from '@/types';
import { BADGES } from '@/types';
import { BarChart3, Users, TreePine, Trophy } from 'lucide-react';

const RANK_STYLE = [
  { color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', label: '1st' },
  { color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200',     label: '2nd' },
  { color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',   label: '3rd' },
] as const;

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [reportsRes] = await Promise.all([
        fetch('/api/reports?limit=20'),
      ]);

      const reportsData: Report[] = await reportsRes.json().catch(() => []);
      setReports(Array.isArray(reportsData) ? reportsData : []);

      // Fetch leaderboard from supabase directly
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

    fetchData();
  }, []);

  const speciesCount = new Set(reports.map((r) => r.species_name)).size;

  const STATS = [
    { label: 'Total Reports', value: reports.length, icon: BarChart3, color: 'text-emerald-600' },
    { label: 'Species Identified', value: speciesCount, icon: TreePine, color: 'text-green-600' },
    { label: 'Community Members', value: memberCount, icon: Users, color: 'text-blue-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Community Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color }) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Reports</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              No reports yet. <a href="/report" className="text-emerald-600 hover:underline">Be the first!</a>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
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
                      {/* Rank badge */}
                      {rank ? (
                        <span className={`text-xs font-bold w-8 h-8 flex items-center justify-center rounded-full border ${rank.bg} ${rank.color} flex-shrink-0`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-xs font-bold w-8 text-center text-gray-400 flex-shrink-0">
                          {idx + 1}
                        </span>
                      )}

                      {/* Avatar */}
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                        {user.username?.[0]?.toUpperCase() ?? '?'}
                      </div>

                      {/* Name + badge */}
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
    </div>
  );
}
