export type HouseholdRelationship =
  | 'self'
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'relative'
  | 'other';

export interface HouseholdMember {
  id: string;
  ownerId: string;
  displayName: string;
  relationship: HouseholdRelationship;
  dateOfBirth?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const HOUSEHOLD_RELATIONSHIP_LABELS: Record<
  HouseholdRelationship,
  { en: string; ne: string }
> = {
  self: { en: 'Myself', ne: 'म आफैं' },
  parent: { en: 'Parent', ne: 'अभिभावक' },
  child: { en: 'Child', ne: 'छोरा/छोरी' },
  spouse: { en: 'Spouse', ne: 'श्रीमान/श्रीमती' },
  sibling: { en: 'Sibling', ne: 'दाजु/भाइ/दिदी/बहिनी' },
  relative: { en: 'Relative', ne: 'नातेदार' },
  other: { en: 'Other', ne: 'अन्य' },
};
