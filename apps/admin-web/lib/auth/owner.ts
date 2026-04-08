interface OwnerIdentity {
  id?: string | null;
  email?: string | null;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getOwnerIds(): string[] {
  return Array.from(
    new Set([
      ...parseCsv(process.env.OWNER_USER_ID),
      ...parseCsv(process.env.OWNER_USER_IDS),
    ]),
  );
}

export function getOwnerEmails(): string[] {
  return Array.from(
    new Set(
      [
        ...parseCsv(process.env.OWNER_EMAIL),
        ...parseCsv(process.env.OWNER_EMAILS),
      ].map(normalizeEmail),
    ),
  );
}

export function isOwnerLockEnabled(): boolean {
  return getOwnerIds().length > 0 || getOwnerEmails().length > 0;
}

export function isOwnerUser(identity: OwnerIdentity): boolean {
  const ownerIds = getOwnerIds();
  const ownerEmails = getOwnerEmails();

  if (ownerIds.length === 0 && ownerEmails.length === 0) {
    return true;
  }

  if (identity.id && ownerIds.includes(identity.id)) {
    return true;
  }

  if (identity.email) {
    const normalized = normalizeEmail(identity.email);
    if (ownerEmails.includes(normalized)) {
      return true;
    }
  }

  return false;
}

export function isAdminPromotionEnabled(): boolean {
  return process.env.ADMIN_ROLE_PROMOTION_ENABLED === 'true';
}
