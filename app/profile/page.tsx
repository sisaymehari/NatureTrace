'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { User, Report } from '@/types';
import { BADGES, CATEGORY_COLORS } from '@/types';
import { Leaf, Star, FileText, Shield, CheckCircle, Loader, Clock, MapPin } from 'lucide-react';

// Point milestones for the eco-points progress bar
const MILESTONES = [50, 100, 250, 500, 1000];

function getMilestoneRange(points: number): { prev: number; next: number; label: string } {
  const next = MILESTONES.find((m) => m > points) ?? MILESTONES[MILESTONES.length - 1];
  const idx = MILESTONES.indexOf(next);
  const prev = idx > 0 ? MILESTONES[idx - 1] : 0;
  const labels = ['Seedling', 'Observer', 'Scout', 'Guardian', 'Champion'];
  return { prev, next, label: labels[idx] ?? 'Champion' };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Loader className="w-3 h-3" /> },
  verified: { label: 'Verified', color: 'bg-green-100 text-green-800 border-green-200',    icon: <CheckCircle className="w-3 h-3" /> },
  resolved: { label: 'Resolved', color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: <CheckCircle className="w-3 h-3" /> },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      setEmail(authUser.email ?? '');

      const [{ data: profile }, { data: userReports }, streakRes] = await Promise.all([
        supabase.from('users').select('id, username, avatar_url, eco_points, badge_ids, reports_count, current_streak, last_login_date, created_at').eq('id', authUser.id).single(),
        supabase.from('reports').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
        fetch('/api/streak', { method: 'POST' }),
      ]);

      const profileData = profile as User;
      setUser(profileData);
      setReports((userReports as Report[]) ?? []);

      if (streakRes.ok) {
        const { streak: s } = await streakRes.json();
        console.log('[Profile] streak from API:', s);
        setStreak(s ?? profileData?.current_streak ?? 0);
      } else {
        setStreak(profileData?.current_streak ?? 0);
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-400">Loading profile…</div>
      </div>
    );
  }

  if (!user) return null;

  const earnedBadges = user.badge_ids ?? [];
  const points = user.eco_points ?? 0;
  const verifiedCount = reports.filter((r) => r.status === 'verified').length;
  const { prev, next, label: nextLabel } = getMilestoneRange(points);
  const progressPct = points >= next ? 100 : Math.round(((points - prev) / (next - prev)) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Profile header card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Green banner */}
        <div className="h-20 bg-gradient-to-r from-emerald-600 to-green-500" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full bg-emerald-600 border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-white select-none">
              {user.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.username ?? 'Citizen Scientist'}</h1>
              {email && <p className="text-sm text-gray-500 mt-0.5">{email}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Member since {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 font-bold text-sm px-3 py-1.5 rounded-full flex-shrink-0">
                🔥 {streak} day streak
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: FileText,     label: 'Reports',  value: reports.length,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: CheckCircle,  label: 'Verified', value: verifiedCount,   color: 'text-green-600',   bg: 'bg-green-50' },
              { icon: Shield,       label: 'Badges',   value: earnedBadges.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className={`rounded-xl ${bg} p-3 text-center`}>
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <p className="text-xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Eco-points progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-800">{points} eco points</span>
              </div>
              {points < 1000 && (
                <span className="text-xs text-gray-400">{next - points} pts to {nextLabel}</span>
              )}
              {points >= 1000 && (
                <span className="text-xs text-emerald-600 font-semibold">Max rank reached!</span>
              )}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-300">
              <span>{prev}</span>
              <span>{next >= 1000 ? '1000+' : next}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Badges grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" /> Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(BADGES).map(([id, badge]) => {
            const earned = earnedBadges.includes(id);
            return (
              <div
                key={id}
                title={badge.description}
                className={`rounded-xl p-4 text-center border transition-all ${
                  earned
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div
                  className="text-4xl mb-2 leading-none"
                  style={earned ? {} : { filter: 'grayscale(1) opacity(0.35)' }}
                >
                  {badge.icon}
                </div>
                <p className={`text-xs font-semibold ${earned ? 'text-gray-800' : 'text-gray-400'}`}>
                  {badge.label}
                </p>
                <p className={`text-xs mt-0.5 ${earned ? 'text-gray-500' : 'text-gray-300'}`}>
                  {earned ? badge.description : '🔒 Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── My Reports ── */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-600" /> My Reports ({reports.length})
        </h2>

        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 mb-3">No reports yet</p>
            <a
              href="/report"
              className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              Submit your first report
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => {
              const colors = CATEGORY_COLORS[r.category];
              const status = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
              return (
                <Link key={r.id} href={`/report/${r.id}`} className="block">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex gap-0 overflow-hidden">
                    {r.photo_url ? (
                      <img
                        src={r.photo_url}
                        alt={r.species_name}
                        className="w-20 h-20 flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-300">
                        <Leaf className="w-6 h-6" />
                      </div>
                    )}
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {r.category}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-gray-900 truncate">{r.species_name}</p>
                      {r.location_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{r.location_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(r.created_at)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
