describe('owner auth helpers', () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    delete process.env.OWNER_USER_ID;
    delete process.env.OWNER_USER_IDS;
    delete process.env.OWNER_EMAIL;
    delete process.env.OWNER_EMAILS;
  });

  afterAll(() => {
    process.env = env;
  });

  it('treats everyone as owner when owner lock is not configured', () => {
    const { isOwnerUser, isProtectedOwnerIdentity } = require('./owner');

    expect(isOwnerUser({ id: 'abc' })).toBe(true);
    expect(isProtectedOwnerIdentity({ id: 'abc' })).toBe(false);
  });

  it('matches configured owner by email case-insensitively', () => {
    process.env.OWNER_EMAIL = 'Founder@Example.com';
    const { isOwnerUser, isProtectedOwnerIdentity } = require('./owner');

    expect(isOwnerUser({ email: 'founder@example.com' })).toBe(true);
    expect(isProtectedOwnerIdentity({ email: 'founder@example.com' })).toBe(true);
  });

  it('matches configured owner by id', () => {
    process.env.OWNER_USER_ID = 'user-123';
    const { isOwnerUser, isProtectedOwnerIdentity } = require('./owner');

    expect(isOwnerUser({ id: 'user-123' })).toBe(true);
    expect(isProtectedOwnerIdentity({ id: 'user-123' })).toBe(true);
    expect(isOwnerUser({ id: 'other-user' })).toBe(false);
  });
});
