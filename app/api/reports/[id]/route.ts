import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/reports/[id]'>) {
  try {
    const { id } = await ctx.params;
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from('reports')
      .select('*, users(id, username, avatar_url, eco_points)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      throw error;
    }

    // Decode PostGIS EWKB hex → lat/lng
    let latitude: number | null = null;
    let longitude: number | null = null;
    const loc = data.location;
    if (loc && typeof loc === 'string' && /^[0-9a-fA-F]+$/.test(loc)) {
      try {
        const buf = Buffer.from(loc, 'hex');
        const isLE = buf[0] === 1;
        const type = isLE ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
        const hasSrid = !!(type & 0x20000000);
        const offset = 5 + (hasSrid ? 4 : 0);
        longitude = isLE ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
        latitude  = isLE ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
      } catch {}
    }

    return NextResponse.json({ ...data, latitude, longitude });
  } catch (err: any) {
    console.error('[GET /api/reports/[id]]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
