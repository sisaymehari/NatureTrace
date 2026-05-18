import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_base64 } = await req.json();
    if (!image_base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const path = `${user.id}/${Date.now()}.jpg`;

    console.log('[/api/upload] user=%s size=%dKB path=%s', user.id, Math.round(buffer.length / 1024), path);

    const service = createServiceRoleClient();
    const { error } = await service.storage
      .from('reports')
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });

    if (error) {
      console.error('[/api/upload] storage error:', JSON.stringify(error));
      throw error;
    }

    const { data } = service.storage.from('reports').getPublicUrl(path);
    console.log('[/api/upload] public url:', data.publicUrl);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: any) {
    console.error('[/api/upload] caught:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
