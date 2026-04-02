import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/home', '/login', '/api/'],
      },
      // Social crawlers need OG image access for rich previews.
      {
        userAgent: ['Twitterbot', 'facebookexternalhit', 'Facebot', 'LinkedInBot', 'Slackbot', 'Discordbot', 'WhatsApp'],
        allow: ['/', '/api/og', '/api/og/', '/api/og/commitment/', '/api/og/province/'],
        disallow: ['/home', '/login'],
      },
      // Allow AI crawlers to access public API data for GEO
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
      {
        userAgent: 'Applebot-Extended',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
        disallow: ['/api/', '/home', '/login'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
