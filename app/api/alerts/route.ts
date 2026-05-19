import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getAlertContacts } from '@/lib/alert-contacts';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.ALERT_FROM_EMAIL ?? 'BioGuard Alerts <onboarding@resend.dev>';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// ── Who-can-help info (mirrors report detail page) ────────────────────────────
const RESPONDERS: Record<string, { name: string; url?: string; phone?: string }> = {
  wildlife:                { name: 'RSPCA',                              url: 'https://www.rspca.org.uk/report' },
  plant:                   { name: 'Natural England',                    url: 'https://www.gov.uk/natural-england' },
  marine:                  { name: 'Marine Conservation Society',        url: 'https://www.mcsuk.org' },
  invasive:                { name: 'GB Non-Native Species Secretariat',  url: 'https://www.nonnativespecies.org/reporting' },
  pollution:               { name: 'Environment Agency',                 url: 'https://www.gov.uk/report-an-environmental-incident' },
  illegal_dumping:         { name: 'Local Council (fly-tipping)',        url: 'https://www.gov.uk/report-flytipping' },
  habitat_destruction:     { name: 'Forestry Commission',                url: 'https://www.gov.uk/government/organisations/forestry-commission' },
  environmental_emergency: { name: 'Environment Agency Emergency Line',  phone: '0800 80 70 60' },
};

// ── EWKB hex → lat/lng (reused from reports route) ───────────────────────────
function decodeLocation(loc: unknown): { latitude: number | null; longitude: number | null } {
  if (loc && typeof loc === 'string' && /^[0-9a-fA-F]+$/.test(loc)) {
    try {
      const buf = Buffer.from(loc, 'hex');
      const isLE = buf[0] === 1;
      const type = isLE ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
      const hasSrid = !!(type & 0x20000000);
      const offset = 5 + (hasSrid ? 4 : 0);
      return {
        longitude: isLE ? buf.readDoubleLE(offset)     : buf.readDoubleBE(offset),
        latitude:  isLE ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8),
      };
    } catch {}
  }
  if (loc && typeof loc === 'object' && Array.isArray((loc as any).coordinates)) {
    return { longitude: (loc as any).coordinates[0], latitude: (loc as any).coordinates[1] };
  }
  return { latitude: null, longitude: null };
}

// ── Category display helpers ──────────────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  wildlife: 'Wildlife', plant: 'Plant', marine: 'Marine', invasive: 'Invasive Species',
  habitat_destruction: 'Habitat Destruction', illegal_dumping: 'Illegal Dumping',
  pollution: 'Pollution', environmental_emergency: 'Environmental Emergency',
};

const SEVERITY_COLOR: Record<string, string> = {
  low: '#6B7280', medium: '#D97706', high: '#DC2626',
};

// ── HTML email builder ────────────────────────────────────────────────────────
function buildEmail(report: any, alertType: string): { subject: string; html: string } {
  const { latitude, longitude } = decodeLocation(report.location);
  const categoryLabel  = CATEGORY_LABEL[report.category] ?? report.category;
  const severityColor  = SEVERITY_COLOR[report.severity ?? 'low'];
  const locationText   = report.location_name ?? 'Unknown location';
  const reportUrl      = `${APP_URL}/report/${report.id}`;
  const mapsUrl        = latitude != null
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : null;
  const responder      = RESPONDERS[report.category];

  const subject = `🚨 BioGuard Alert: ${categoryLabel} reported at ${locationText}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:system-ui,-apple-system,sans-serif;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1D6A48;">
    <tr>
      <td style="padding:24px 32px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#2A8A5E;border-radius:12px;padding:10px 14px;margin-right:12px;">
              <span style="font-size:22px;">🛡️</span>
            </td>
            <td style="padding-left:12px;">
              <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">BioGuard</div>
              <div style="color:#6EE7B7;font-size:12px;margin-top:2px;">Biodiversity Alert System</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Alert badge -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1D6A48;">
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:10px 16px;display:inline-block;">
          <span style="color:#fff;font-size:13px;font-weight:600;">🚨 &nbsp;New ${categoryLabel} Report</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Main content -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">

          <!-- Report card -->
          <tr>
            <td style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

              ${report.photo_url ? `
              <!-- Photo -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <img src="${report.photo_url}" alt="Report photo"
                      style="width:100%;max-height:280px;object-fit:cover;display:block;" />
                  </td>
                </tr>
              </table>` : ''}

              <table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 28px 8px;">

                <!-- Category + Severity -->
                <tr>
                  <td style="padding-bottom:16px;">
                    <span style="background:#DCFCE7;color:#166534;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${categoryLabel}</span>
                    <span style="background:${severityColor}22;color:${severityColor};font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;margin-left:8px;">${report.severity ?? 'low'} severity</span>
                    ${report.is_invasive ? '<span style="background:#FEE2E2;color:#991B1B;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;margin-left:8px;">⚠️ Invasive</span>' : ''}
                  </td>
                </tr>

                <!-- Species / Incident name -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#111827;">${report.species_name ?? 'Unknown'}</h1>
                  </td>
                </tr>

                <!-- Details grid -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">

                      <tr style="background:#F9FAFB;">
                        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;width:120px;">Category</td>
                        <td style="padding:10px 16px;font-size:14px;color:#111827;border-bottom:1px solid #E5E7EB;">${categoryLabel}</td>
                      </tr>

                      <tr>
                        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Location</td>
                        <td style="padding:10px 16px;font-size:14px;color:#111827;border-bottom:1px solid #E5E7EB;">
                          📍 ${locationText}
                          ${mapsUrl ? `<br><a href="${mapsUrl}" style="color:#1D6A48;font-size:12px;text-decoration:none;">View on Google Maps →</a>` : ''}
                        </td>
                      </tr>

                      ${latitude != null ? `
                      <tr style="background:#F9FAFB;">
                        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Coordinates</td>
                        <td style="padding:10px 16px;font-size:13px;color:#374151;border-bottom:1px solid #E5E7EB;font-family:monospace;">${latitude.toFixed(6)}, ${longitude!.toFixed(6)}</td>
                      </tr>` : ''}

                      ${report.description ? `
                      <tr>
                        <td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Description</td>
                        <td style="padding:10px 16px;font-size:14px;color:#374151;line-height:1.6;">${report.description}</td>
                      </tr>` : ''}

                    </table>
                  </td>
                </tr>

                <!-- View report button -->
                <tr>
                  <td style="padding-bottom:24px;text-align:center;">
                    <a href="${reportUrl}"
                      style="display:inline-block;background:#1D6A48;color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:50px;letter-spacing:0.2px;">
                      View Full Report →
                    </a>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Who can help -->
          ${responder ? `
          <tr><td style="height:16px;"></td></tr>
          <tr>
            <td style="background:#ECFDF5;border:1px solid #D1FAE5;border-radius:16px;padding:20px 24px;">
              <div style="font-size:12px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">🏛 Who can help?</div>
              <div style="font-size:15px;font-weight:600;color:#111827;margin-bottom:4px;">${responder.name}</div>
              ${responder.url
                ? `<a href="${responder.url}" style="color:#1D6A48;font-size:13px;">${responder.url}</a>`
                : `<span style="color:#DC2626;font-weight:700;font-size:15px;">📞 ${responder.phone}</span>`}
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td style="text-align:center;padding-bottom:24px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                This alert was generated automatically by
                <a href="${APP_URL}" style="color:#1D6A48;text-decoration:none;font-weight:600;">BioGuard</a>
                · UK Biodiversity Reporting Platform
              </p>
              <p style="margin:6px 0 0;font-size:11px;color:#D1D5DB;">
                Report ID: ${report.id}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return { subject, html };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { report_id, alert_type } = await req.json();
    const service = createServiceRoleClient();

    // 1. Persist alert record
    const { error: insertError } = await service.from('alerts').insert({
      report_id,
      alert_type,
      acknowledged: false,
    });
    if (insertError) throw insertError;

    // 2. Fetch full report
    const { data: report, error: fetchError } = await service
      .from('reports')
      .select('id, species_name, category, description, photo_url, location, location_name, severity, is_invasive')
      .eq('id', report_id)
      .single();

    if (fetchError || !report) {
      console.error('[/api/alerts] could not fetch report:', fetchError?.message);
      return NextResponse.json({ ok: true, email: 'skipped — report not found' });
    }

    // 3. Resolve recipients
    const contacts = getAlertContacts(alert_type);
    console.log(`[/api/alerts] sending "${alert_type}" alert to:`, contacts.map((c) => c.email));

    // 4. Build email
    const { subject, html } = buildEmail(report, alert_type);

    // 5. Send via Resend
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_key_here') {
      console.warn('[/api/alerts] RESEND_API_KEY not set — email skipped. Subject would be:', subject);
      return NextResponse.json({ ok: true, email: 'skipped — no API key', subject });
    }

    const results = await Promise.allSettled(
      contacts.map((contact) =>
        resend.emails.send({
          from: FROM,
          to:   contact.email,
          subject,
          html,
        })
      )
    );

    const sent     = results.filter((r) => r.status === 'fulfilled').length;
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length) {
      failures.forEach((f) => console.error('[/api/alerts] send failure:', (f as PromiseRejectedResult).reason));
    }

    console.log(`[/api/alerts] sent ${sent}/${contacts.length} emails for report ${report_id}`);
    return NextResponse.json({ ok: true, sent, total: contacts.length });

  } catch (err: any) {
    console.error('[/api/alerts]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
