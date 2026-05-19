import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

function escapeCell(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    const service = createServiceRoleClient();

    const { data, error } = await service
      .from('reports')
      .select('*, users(username)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []).map((r: any) => {
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
        } catch {}
      } else if (loc && typeof loc === 'object' && Array.isArray((loc as any).coordinates)) {
        longitude = (loc as any).coordinates[0];
        latitude  = (loc as any).coordinates[1];
      }

      return [
        r.id,
        r.species_name,
        r.category,
        r.description,
        r.location_name,
        latitude,
        longitude,
        r.status,
        r.is_invasive,
        r.is_verified ?? false,
        r.created_at,
        r.users?.username ?? '',
      ].map(escapeCell).join(',');
    });

    const header = 'id,species_name,category,description,location_name,latitude,longitude,status,is_invasive,is_verified,date_submitted,reporter_username';
    const csv = [header, ...rows].join('\n');

    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bioguard-reports-${date}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/export]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
