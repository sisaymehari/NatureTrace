import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

const BADGE_TRIGGERS = {
  first_report: async (service: any, userId: string) => {
    const { count } = await service.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    return count === 1;
  },
  invasive_spotter: async (service: any, userId: string) => {
    const { count } = await service.from('reports').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_invasive', true);
    return count >= 3;
  },
  top_reporter: async (service: any, userId: string) => {
    const { data } = await service.from('users').select('eco_points').eq('id', userId).single();
    return (data?.eco_points ?? 0) >= 500;
  },
};

async function checkBadges(service: any, userId: string, currentBadges: string[]): Promise<string[]> {
  const unlocked: string[] = [];
  for (const [badgeId, check] of Object.entries(BADGE_TRIGGERS)) {
    if (currentBadges.includes(badgeId)) continue;
    const earned = await check(service, userId);
    if (earned) unlocked.push(badgeId);
  }
  return unlocked;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, species_name, description, photo_url, latitude, longitude, location_name, ai_confidence, is_invasive, severity } = body;

    console.log('[POST /api/reports] user.id=%s', user.id);
    const service = createServiceRoleClient();

    // Ensure the user row exists before inserting a report (FK constraint: reports.user_id → users.id)
    const { data: userData, error: userFetchError } = await service
      .from('users')
      .select('eco_points, badge_ids, reports_count')
      .eq('id', user.id)
      .single();

    if (userFetchError) {
      const { error: createUserError } = await service.from('users').insert({
        id: user.id,
        eco_points: 0,
        badge_ids: [],
        reports_count: 0,
      });
      if (createUserError && createUserError.code !== '23505') {
        console.error('[POST /api/reports] failed to create user row:', JSON.stringify(createUserError));
        throw createUserError;
      }
    }

    const location = latitude != null && longitude != null
      ? `SRID=4326;POINT(${longitude} ${latitude})`
      : null;

    const insertPayload = {
      user_id: user.id,
      category,
      species_name,
      description,
      photo_url: photo_url ?? null,
      location,
      location_name: location_name ?? null,
      ai_confidence: ai_confidence ?? null,
      is_invasive: is_invasive ?? false,
      severity: severity ?? 'low',
      status: 'pending',
    };
    console.log('[POST /api/reports] inserting:', JSON.stringify(insertPayload));

    // Use the session-authenticated client so the RLS policy
    // "WITH CHECK (auth.uid() = user_id)" is satisfied by the user's JWT.
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/reports] insert error:', JSON.stringify(insertError));
      throw insertError;
    }

    let eco_points_earned = 10;
    if (is_invasive) eco_points_earned += 30;
    if (severity === 'high') eco_points_earned += 25;

    await service.from('users').update({
      eco_points: (userData?.eco_points ?? 0) + eco_points_earned,
      reports_count: (userData?.reports_count ?? 0) + 1,
    }).eq('id', user.id);

    const currentBadges = userData?.badge_ids ?? [];
    const newBadges = await checkBadges(service, user.id, currentBadges);
    if (newBadges.length > 0) {
      await service.from('users').update({
        badge_ids: [...currentBadges, ...newBadges],
      }).eq('id', user.id);
    }

    if (is_invasive || severity === 'high') {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          alert_type: is_invasive ? 'invasive_species' : 'high_severity',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      report_id: report.id,
      eco_points_earned,
      badges_unlocked: newBadges,
    });
  } catch (err: any) {
    console.error('[POST /api/reports] caught:', JSON.stringify(err));
    return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const service = createServiceRoleClient();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    let query = service
      .from('reports')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const isInvasive = searchParams.get('is_invasive');
    if (isInvasive === 'true') {
      query = query.eq('is_invasive', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    // PostgREST returns geography(Point) as EWKB hex, e.g. 0101000020E6100000<lng><lat>
    const reports = (data ?? []).map((r: any) => {
      let latitude: number | null = null;
      let longitude: number | null = null;
      const loc = r.location;
      if (loc && typeof loc === 'string' && /^[0-9a-fA-F]+$/.test(loc)) {
        try {
          const buf = Buffer.from(loc, 'hex');
          const isLE = buf[0] === 1;
          const type = isLE ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
          const hasSrid = !!(type & 0x20000000);
          const offset = 5 + (hasSrid ? 4 : 0);
          longitude = isLE ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
          latitude  = isLE ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
        } catch (e) {
          console.error('[GET /api/reports] failed to decode location:', loc, e);
        }
      } else if (loc && typeof loc === 'object' && Array.isArray(loc.coordinates)) {
        longitude = loc.coordinates[0];
        latitude  = loc.coordinates[1];
      }
      return { ...r, latitude, longitude };
    });

    return NextResponse.json(reports);
  } catch (err: any) {
    console.error('[GET /api/reports]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
