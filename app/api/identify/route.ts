import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripJsonFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { image_base64, description, region = 'UK' } = await req.json();

    console.log('[/api/identify] model=claude-sonnet-4-6 key_prefix=%s image=%s',
      process.env.ANTHROPIC_API_KEY?.slice(0, 14) ?? 'MISSING',
      image_base64 ? `${Math.round(image_base64.length / 1024)}KB` : 'none',
    );

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: [
          ...(image_base64
            ? [{
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'image/jpeg' as const,
                  data: image_base64.replace(/^data:image\/\w+;base64,/, ''),
                },
              }]
            : []),
          {
            type: 'text',
            text: `Region: ${region}. User description: ${description || 'No description provided'}.
Return JSON: { "species_name": string, "scientific_name": string, "category": "wildlife"|"plant"|"marine"|"invasive", "confidence": number (0-100), "is_invasive": boolean, "conservation_note": string, "similar_species": string[] }`,
          },
        ],
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system:
        'You are a biodiversity expert specialising in UK wildlife, plants, marine life, and invasive species. Always respond with ONLY valid JSON — no markdown, no explanation.',
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = stripJsonFences(rawText);
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[/api/identify] message:', err.message);
    console.error('[/api/identify] http_status:', err.status);
    console.error('[/api/identify] api_error:', JSON.stringify(err.error ?? null));
    console.error('[/api/identify] stack:', err.stack);
    return NextResponse.json(
      { error: err.message ?? 'Failed to identify species', status: err.status, detail: err.error },
      { status: 500 },
    );
  }
}
