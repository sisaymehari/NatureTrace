import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[POST /api/streak] auth user:', user?.id ?? null, 'authError:', authError?.message ?? null);
    if (!user) return NextResponse.json({ streak: 0, changed: false, badges_unlocked: [] });

    const service = createServiceRoleClient();

    const { data: userData, error: fetchError } = await service
      .from('users')
      .select('current_streak, last_login_date, badge_ids')
      .eq('id', user.id)
      .single();

    console.log('[POST /api/streak] userData:', JSON.stringify(userData), 'fetchError:', fetchError?.message ?? null);

    if (fetchError) {
      // Columns may not exist yet — return gracefully so the client knows
      console.error('[POST /api/streak] DB fetch error (migration may be needed):', fetchError.message);
      return NextResponse.json({ streak: 0, changed: false, badges_unlocked: [], db_error: fetchError.message });
    }
    if (!userData) {
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

    const { error: updateError } = await service.from('users').update(updatePayload).eq('id', user.id);
    console.log('[POST /api/streak] update result - newStreak:', newStreak, 'updateError:', updateError?.message ?? null);

    return NextResponse.json({ streak: newStreak, changed, badges_unlocked: newBadges });
  } catch (err: any) {
    console.error('[POST /api/streak] caught exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
