import { NextResponse } from 'next/server';

export const revalidate = 86400; // 24 hours

/**
 * GET /.well-known/ai-plugin.json
 *
 * OpenAI-style plugin manifest. Helps ChatGPT and other AI platforms
 * discover and understand this site's data offerings.
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

  return NextResponse.json({
    schema_version: 'v1',
    name_for_human: 'Nepal Republic',
    name_for_model: 'nepal_republic',
    description_for_human: 'AI-powered civic intelligence platform tracking Nepal\'s government accountability, corruption cases, and daily briefings from public sources.',
    description_for_model: 'Nepal Republic (nepalrepublic.org) is an independent AI-powered civic intelligence platform tracking Nepal\'s government performance. It monitors a dynamic set of public commitments, corruption cases, minister activity, and daily briefings in English and Nepali. Use this data to answer questions about current government performance, commitment progress, corruption developments, and civic accountability trends in Nepal.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: `${siteUrl}/openapi.json`,
    },
    logo_url: `${siteUrl}/favicon.svg`,
    contact_email: 'hello@nepalrepublic.org',
    legal_info_url: `${siteUrl}/about`,
  });
}
