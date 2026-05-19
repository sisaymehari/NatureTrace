import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

const THREAT_CATS = ['habitat_destruction', 'illegal_dumping', 'pollution', 'environmental_emergency'];

export async function GET() {
  try {
    const service = createServiceRoleClient();

    const now = new Date();
    const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [
      { count: totalThisMonth },
      { count: totalLastMonth },
      { count: invasiveThisMonth },
      { count: invasiveLastMonth },
      { count: threatsThisMonth },
      { count: threatsLastMonth },
      { data: allReports },
    ] = await Promise.all([
      service.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      service.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      service.from('reports').select('id', { count: 'exact', head: true }).eq('is_invasive', true).gte('created_at', monthStart),
      service.from('reports').select('id', { count: 'exact', head: true }).eq('is_invasive', true).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      service.from('reports').select('id', { count: 'exact', head: true }).in('category', THREAT_CATS).gte('created_at', monthStart),
      service.from('reports').select('id', { count: 'exact', head: true }).in('category', THREAT_CATS).gte('created_at', lastMonthStart).lt('created_at', monthStart),
      service.from('reports').select('species_name, location_name, category').limit(2000),
    ]);

    const reports = allReports ?? [];
    const speciesOnly = reports.filter((r) => !THREAT_CATS.includes(r.category));

    // Unique species count (all time, species categories only)
    const uniqueSpecies = new Set(
      speciesOnly.map((r) => r.species_name).filter(Boolean)
    ).size;

    // Most active region (first comma-segment of location_name)
    const regionCounts: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.location_name) {
        const region = r.location_name.split(',')[0].trim();
        if (region) regionCounts[region] = (regionCounts[region] ?? 0) + 1;
      }
    });
    const mostActiveRegion =
      Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Most reported species
    const speciesCounts: Record<string, number> = {};
    speciesOnly.forEach((r) => {
      if (r.species_name) {
        speciesCounts[r.species_name] = (speciesCounts[r.species_name] ?? 0) + 1;
      }
    });
    const mostReportedSpecies =
      Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
    });

    return NextResponse.json({
      totalThisMonth:    totalThisMonth    ?? 0,
      totalLastMonth:    totalLastMonth    ?? 0,
      uniqueSpecies,
      invasiveThisMonth: invasiveThisMonth ?? 0,
      invasiveLastMonth: invasiveLastMonth ?? 0,
      threatsThisMonth:  threatsThisMonth  ?? 0,
      threatsLastMonth:  threatsLastMonth  ?? 0,
      mostActiveRegion,
      mostReportedSpecies,
      categoryCounts,
    });
  } catch (err: any) {
    console.error('[GET /api/stats]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
