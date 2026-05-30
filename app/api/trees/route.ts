import { NextRequest, NextResponse } from 'next/server';

// Server-side cache survives across requests in the same Node process
const cache = new Map<string, { nodes: any[]; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/cgi/interpreter',
];

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const s = parseFloat(sp.get('s') ?? '');
  const n = parseFloat(sp.get('n') ?? '');
  const w = parseFloat(sp.get('w') ?? '');
  const e = parseFloat(sp.get('e') ?? '');

  if ([s, n, w, e].some(isNaN))
    return NextResponse.json({ error: 'Invalid bbox' }, { status: 400 });

  if ((n - s) > 0.1 || (e - w) > 0.1)
    return NextResponse.json({ error: 'Viewport too large' }, { status: 400 });

  // Round to 3 dp (~111 m) for cache key
  const key = `${s.toFixed(3)},${w.toFixed(3)},${n.toFixed(3)},${e.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL)
    return NextResponse.json({ nodes: hit.nodes }, { headers: { 'X-Cache': 'HIT' } });

  const query =
    `[out:json][timeout:25];` +
    `node["natural"="tree"](${s.toFixed(6)},${w.toFixed(6)},${n.toFixed(6)},${e.toFixed(6)});` +
    `out 300;`;
  const body = new URLSearchParams({ data: query });

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const nodes: any[] = data.elements ?? [];
      cache.set(key, { nodes, cachedAt: Date.now() });
      return NextResponse.json({ nodes });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'Tree data unavailable' }, { status: 503 });
}
