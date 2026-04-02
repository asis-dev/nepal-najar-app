import { NextResponse } from 'next/server';

export const revalidate = 86400; // 24h

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Nepal Republic Public API',
      version: '1.0.0',
      description:
        'Read-only public endpoints for commitments, daily briefings, ministers, corruption tracking, and trend updates.',
    },
    servers: [{ url: siteUrl }],
    paths: {
      '/api/commitments': {
        get: {
          summary: 'List public commitments',
          responses: {
            200: { description: 'Commitment dataset returned successfully.' },
          },
        },
      },
      '/api/daily-brief': {
        get: {
          summary: 'Fetch the latest daily brief',
          responses: {
            200: { description: 'Daily brief returned successfully.' },
          },
        },
      },
      '/api/trending': {
        get: {
          summary: 'Fetch trending topics and commitments',
          responses: {
            200: { description: 'Trending data returned successfully.' },
          },
        },
      },
      '/api/ministers': {
        get: {
          summary: 'Fetch minister activity summaries',
          responses: {
            200: { description: 'Minister activity data returned successfully.' },
          },
        },
      },
      '/api/corruption/stats': {
        get: {
          summary: 'Fetch corruption tracker aggregate statistics',
          responses: {
            200: { description: 'Corruption stats returned successfully.' },
          },
        },
      },
      '/api/corruption/cases': {
        get: {
          summary: 'List corruption cases',
          responses: {
            200: { description: 'Corruption case list returned successfully.' },
          },
        },
      },
      '/api/what-changed': {
        get: {
          summary: 'Fetch recent verified changes across feeds',
          responses: {
            200: { description: 'Recent changes returned successfully.' },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
