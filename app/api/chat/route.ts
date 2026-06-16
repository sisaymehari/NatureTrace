import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, user_location } = await req.json();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are NatureTrace's biodiversity assistant specialising in UK ecosystems. Help citizen scientists identify species and report threats accurately. If confident in an ID, suggest they log it using the Report tab. Flag invasive species clearly. Keep responses concise and encouraging.${user_location ? ` User location: ${user_location}.` : ''}`,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ response: text });
  } catch (err: any) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
