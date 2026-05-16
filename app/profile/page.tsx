'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import ReportCard from '@/components/ReportCard';
import type { User, Report } from '@/types';
import { BADGES } from '@/types';
import { Leaf, Star, FileText, Shield } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const [{ data: profile }, { data: userReports }] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('reports').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }),
      ]);

      setUser(profile as User);
      setReports((userReports as Report[]) ?? []);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-green-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {user.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.username ?? 'Citizen Scientist'}</h1>
            <p className="text-emerald-100 text-sm">Member since {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { icon: FileText, label: 'Reports', value: reports.length },
            { icon: Star, label: 'Eco Points', value: user.eco_points ?? 0 },
            { icon: Shield, label: 'Badges', value: earnedBadges.length },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 mx-auto mb-1 text-emerald-200" />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-emerald-200">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" /> Badges
        </h2>
        {Object.keys(BADGES).length === 0 ? (
          <p className="text-gray-400 text-sm">No badges available</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(BADGES).map(([id, badge]) => {
              const earned = earnedBadges.includes(id);
              return (
                <div
                  key={id}
                  className={`rounded-xl p-3 text-center border transition-all ${
                    earned
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <p className="text-xs font-semibold text-gray-800">{badge.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{badge.description}</p>
                  {!earned && <p className="text-xs text-gray-300 mt-1">Locked</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Reports */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-600" /> My Reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 mb-3">No reports yet</p>
            <a href="/report" className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-800 transition-colors">
              Submit your first report
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
