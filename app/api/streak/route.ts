import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceRoleClient();

    const { data: userData, error: fetchError } = await service
      .from('users')
      .select('current_streak, last_login_date, badge_ids')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json({ streak: 0, changed: false, badges_unlocked: [] });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const lastLogin: string | null = userData.last_login_date;
    const currentStreak: number = userData.current_streak ?? 0;
    const badgeIds: string[] = userData.badge_ids ?? [];

    // Already recorded today — nothing to do
    if (lastLogin === todayStr) {
      return NextResponse.json({ streak: currentStreak, changed: false, badges_unlocked: [] });
    }

    const newStreak = lastLogin === yesterdayStr ? currentStreak + 1 : 1;
    const changed = true;

    const newBadges: string[] = [];
    if (newStreak >= 7  && !badgeIds.includes('streak_7'))  newBadges.push('streak_7');
    if (newStreak >= 30 && !badgeIds.includes('streak_30')) newBadges.push('streak_30');

    const updatePayload: Record<string, unknown> = {
      current_streak: newStreak,
      last_login_date: todayStr,
    };
    if (newBadges.length > 0) {
      updatePayload.badge_ids = [...badgeIds, ...newBadges];
    }

    await service.from('users').update(updatePayload).eq('id', user.id);

    return NextResponse.json({ streak: newStreak, changed, badges_unlocked: newBadges });
  } catch (err: any) {
    console.error('[POST /api/streak]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
