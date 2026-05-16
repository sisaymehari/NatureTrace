import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { report_id, alert_type } = await req.json();
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('alerts').insert({
      report_id,
      alert_type,
      acknowledged: false,
    });

    if (error) throw error;

    // Email placeholder — replace with Resend later
    console.log(`[ALERT] ${alert_type} for report ${report_id}`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[/api/alerts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
