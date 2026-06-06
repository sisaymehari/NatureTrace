import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, species_name, description, photo_url, latitude, longitude, location_name, ai_confidence, is_invasive, severity } = body;

    const service = createServiceRoleClient();

    const location = latitude != null && longitude != null
      ? `SRID=4326;POINT(${longitude} ${latitude})`
      : null;

    const insertPayload = {
      user_id: null,
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

    const { data: report, error: insertError } = await service
      .from('reports')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/reports] insert error:', JSON.stringify(insertError));
      throw insertError;
    }

    const isThreatCategory = ['habitat_destruction', 'illegal_dumping', 'pollution', 'environmental_emergency'].includes(category);
    if (is_invasive || severity === 'high' || isThreatCategory) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: report.id,
          alert_type: isThreatCategory ? category : is_invasive ? 'invasive_species' : 'high_severity',
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ report_id: report.id, eco_points_earned: 0, badges_unlocked: [] });
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

    // PostgREST returns geography(Point) as EWKB hex
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
