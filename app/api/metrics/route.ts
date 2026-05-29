import { NextRequest, NextResponse } from 'next/server';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 10_000;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function overpass(label: string, query: string): Promise<any> {
  console.log(`[metrics][${label}] POST ${OVERPASS_URL}`);
  console.log(`[metrics][${label}] query: ${query.replace(/\s+/g, ' ').trim()}`);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`[metrics][${label}] aborting — exceeded ${TIMEOUT_MS}ms`);
    controller.abort();
  }, TIMEOUT_MS);

  try {
    // Overpass requires application/x-www-form-urlencoded with data= parameter
    const body = new URLSearchParams({ data: query });

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[metrics][${label}] HTTP ${res.status}: ${text.slice(0, 400)}`);
      throw new Error(`Overpass HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log(
      `[metrics][${label}] OK — elements: ${data.elements?.length ?? 0}`,
      JSON.stringify(data.elements ?? []).slice(0, 600)
    );
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// UK urban averages used when Overpass is unreachable
function ukFallback() {
  console.log('[metrics] Using UK urban average fallback values');
  return {
    treesNearby: 5,
    nearestParkDistance: 430,
    canopyCover: 16,
    rating: 'Fair' as const,
    estimated: true,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');

  console.log(`[metrics] GET lat=${lat} lng=${lng}`);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  try {
    // Three separate queries — avoids combined-output parsing ambiguity
    const [trees300Data, trees500Data, parkData] = await Promise.all([
      overpass(
        'trees-300m',
        `[out:json][timeout:25];node["natural"="tree"](around:300,${lat},${lng});out count;`
      ),
      overpass(
        'trees-500m',
        `[out:json][timeout:25];node["natural"="tree"](around:500,${lat},${lng});out count;`
      ),
      overpass(
        'parks-2km',
        `[out:json][timeout:25];way["leisure"="park"](around:2000,${lat},${lng});out center 1;`
      ),
    ]);

    // Parse tree counts — count element has type:"count" and tags.total
    const count300El = (trees300Data.elements ?? []).find((e: any) => e.type === 'count');
    const count500El = (trees500Data.elements ?? []).find((e: any) => e.type === 'count');
    const treesNearby = parseInt(count300El?.tags?.total ?? '0', 10);
    const treesIn500m = parseInt(count500El?.tags?.total ?? '0', 10);
    console.log(`[metrics] treesNearby(300m)=${treesNearby}  treesIn500m=${treesIn500m}`);

    // Canopy cover: 150 trees/km² ≈ 30% canopy in UK urban context
    const areakm2 = Math.PI * 0.5 * 0.5; // 0.785 km²
    const densityPerKm2 = treesIn500m / areakm2;
    const canopyCover = Math.min(100, Math.round((densityPerKm2 / 150) * 30));
    console.log(`[metrics] density=${densityPerKm2.toFixed(1)}/km²  canopyCover=${canopyCover}%`);

    // Nearest park distance
    let nearestParkDistance: number | null = null;
    const parks: any[] = parkData.elements ?? [];
    if (parks.length > 0 && parks[0].center) {
      nearestParkDistance = Math.round(
        haversineMeters(lat, lng, parks[0].center.lat, parks[0].center.lon)
      );
      console.log(
        `[metrics] nearest park center=(${parks[0].center.lat},${parks[0].center.lon}) dist=${nearestParkDistance}m`
      );
    } else {
      console.log('[metrics] no parks found within 2km');
    }

    // 3-30-300 rating
    const std1 = treesNearby >= 3;
    const std2 = canopyCover >= 30;
    const std3 = nearestParkDistance !== null && nearestParkDistance <= 300;
    const metCount = [std1, std2, std3].filter(Boolean).length;
    const rating: 'Good' | 'Fair' | 'Poor' =
      metCount === 3 ? 'Good' : metCount >= 1 ? 'Fair' : 'Poor';

    console.log(`[metrics] standards met: ${metCount}/3  rating=${rating}`);

    return NextResponse.json({ treesNearby, nearestParkDistance, canopyCover, rating });
  } catch (err: any) {
    console.error('[metrics] caught error:', err?.name, err?.message);
    if (err?.stack) console.error('[metrics] stack:', err.stack);
    return NextResponse.json(ukFallback());
  }
}
