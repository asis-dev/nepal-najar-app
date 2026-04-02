import {
  getBearerToken,
  secretsEqual,
  bearerMatchesSecret,
  hasTrustedBrowserOrigin,
} from '@/lib/security/request-auth';

describe('request auth helpers', () => {
  it('parses bearer token from authorization header', () => {
    const headers = new Headers({ authorization: 'Bearer top-secret-token' });
    expect(getBearerToken(headers)).toBe('top-secret-token');
  });

  it('compares secrets safely and correctly', () => {
    expect(secretsEqual('abc', 'abc')).toBe(true);
    expect(secretsEqual('abc', 'abd')).toBe(false);
    expect(secretsEqual('', 'abc')).toBe(false);
  });

  it('matches bearer token against expected secret', () => {
    const req = new Request('https://www.nepalrepublic.org/api/intelligence/sweep', {
      headers: { authorization: 'Bearer sweep-secret' },
    });
    expect(bearerMatchesSecret(req, 'sweep-secret')).toBe(true);
    expect(bearerMatchesSecret(req, 'wrong-secret')).toBe(false);
  });

  it('accepts same-origin browser context', () => {
    const req = new Request('https://www.nepalrepublic.org/api/scrape/source', {
      headers: {
        origin: 'https://www.nepalrepublic.org',
      },
    });
    expect(hasTrustedBrowserOrigin(req)).toBe(true);
  });
});
