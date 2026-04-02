import {
  normalizeShareUrl,
  withShareUtm,
  composeShareMessage,
  shareIntentUrl,
} from '@/lib/utils/share';

describe('share utils', () => {
  it('normalizes relative urls to site origin', () => {
    const url = normalizeShareUrl('/explore/first-100-days');
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain('/explore/first-100-days');
  });

  it('adds UTM params for social attribution', () => {
    const tracked = withShareUtm('https://www.nepalrepublic.org/daily', 'x');
    expect(tracked).toContain('utm_source=x');
    expect(tracked).toContain('utm_medium=social');
    expect(tracked).toContain('utm_campaign=community_share');
  });

  it('builds compact share message', () => {
    const msg = composeShareMessage({
      title: 'Title',
      text: 'Context',
      comment: 'Optional',
    });
    expect(msg).toContain('Optional');
    expect(msg).toContain('Context');
    expect(msg).toContain('Title');
  });

  it('creates share intent urls for known platforms', () => {
    const url = shareIntentUrl('whatsapp', {
      title: 'Nepal Republic',
      text: 'Daily brief',
      url: 'https://www.nepalrepublic.org/daily',
    });
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
  });
});
